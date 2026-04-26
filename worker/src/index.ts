import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env, TgUser } from './types';
import { validateInitData } from './auth';
import { injectZeroWidthWatermark } from './watermark';
import { rateLimit } from './rate-limit';
import {
  countNotifiableUsers,
  createBroadcast,
  getAdminStats,
  getBroadcast,
  listBroadcastRecipients,
  listBroadcasts,
  listFavorites,
  listPurchases,
  logView,
  recordDelivery,
  setBroadcastStatus,
  toggleFavorite,
  upsertUser,
} from './db';
import { deliveryFailureType, sendMessage, sendPhoto } from './telegram';

type Vars = {
  user: TgUser;
  authDate: number;
};

type AppEnv = { Bindings: Env; Variables: Vars };
type Ctx = Context<AppEnv>;

const app = new Hono<AppEnv>();

// CORS is intentionally permissive: all endpoints that mutate or read
// user data require a valid HMAC-signed initData (see requireAuth). The
// Origin header is not a security boundary here — Telegram WebViews on
// iOS/desktop sometimes send `null` or unexpected origins, so echoing
// the request origin is the pragmatic choice.
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowHeaders: ['Content-Type', 'X-TG-Init-Data'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 600,
}));

app.get('/', (c) =>
  c.json({
    name: 'archercoguides-api',
    phase: 2,
    endpoints: [
      'POST /api/auth',
      'GET /api/guides/:slug/content',
      'POST /api/views',
      'POST /api/favorites/:slug',
      'GET /api/me/favorites',
      'GET /api/me/purchases',
      'GET /api/admin/stats',
      'GET /api/admin/broadcast/audience',
      'GET /api/admin/broadcast',
      'POST /api/admin/broadcast',
      'GET /api/admin/broadcast/:id',
    ],
  }),
);

async function requireAuth(c: Ctx): Promise<Response | null> {
  const initData = c.req.header('X-TG-Init-Data') || c.req.query('_init_data') || '';
  const ttl = parseInt(c.env.INITDATA_TTL_SECONDS, 10) || 3600;
  const result = await validateInitData(initData, c.env.BOT_TOKEN, ttl);
  if (!result.ok) {
    return c.json({ error: 'unauthorized', reason: result.reason }, 401);
  }
  c.set('user', result.user);
  c.set('authDate', result.authDate);
  await upsertUser(c.env.DB, result.user);
  return null;
}

app.post('/api/auth', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  const user = c.get('user');
  return c.json({ ok: true, user });
});

app.get('/api/guides/:slug/content', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;

  const user = c.get('user');
  const slug = c.req.param('slug');
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return c.json({ error: 'invalid slug' }, 400);
  }

  const limit = parseInt(c.env.RATE_LIMIT_PER_MINUTE, 10) || 10;
  const allowed = await rateLimit(c.env.RATE_LIMIT, 'content', user.id, limit);
  if (!allowed) {
    return c.json({ error: 'rate_limited' }, 429);
  }

  const upstreamUrl = `${c.env.GUIDES_ORIGIN.replace(/\/$/, '')}/guides/${slug}/content.html`;
  const upstream = await fetch(upstreamUrl, {
    cf: { cacheTtl: 60, cacheEverything: true },
  } as RequestInit);

  if (!upstream.ok) {
    return c.json({ error: 'guide_not_found', status: upstream.status }, 404);
  }

  const html = await upstream.text();
  const stamped = injectZeroWidthWatermark(html, user.id);

  c.executionCtx.waitUntil(logView(c.env.DB, user.id, slug, null));

  return new Response(stamped, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
});

app.post('/api/views', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  const user = c.get('user');
  const body = (await c.req
    .json<{ guide_id?: string; duration_sec?: number }>()
    .catch(() => ({}))) as { guide_id?: string; duration_sec?: number };
  if (!body.guide_id) return c.json({ error: 'guide_id required' }, 400);
  await logView(c.env.DB, user.id, body.guide_id, body.duration_sec ?? null);
  return c.json({ ok: true });
});

app.post('/api/favorites/:slug', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  const user = c.get('user');
  const slug = c.req.param('slug');
  const result = await toggleFavorite(c.env.DB, user.id, slug);
  return c.json(result);
});

app.get('/api/me/favorites', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  const user = c.get('user');
  const ids = await listFavorites(c.env.DB, user.id);
  return c.json({ favorites: ids });
});

app.get('/api/me/purchases', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  const user = c.get('user');
  const rows = await listPurchases(c.env.DB, user.id);
  return c.json({ purchases: rows });
});

function isAdmin(c: Ctx): boolean {
  const user = c.get('user');
  const adminIds = (c.env.ADMIN_TG_IDS ?? '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter(Boolean);
  return adminIds.includes(user.id);
}

app.get('/api/admin/stats', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  if (!isAdmin(c)) return c.json({ error: 'forbidden' }, 403);
  try {
    const stats = await getAdminStats(c.env.DB);
    return c.json(stats);
  } catch (err) {
    console.error('[admin/stats]', err);
    return c.json({ error: 'internal', message: String(err) }, 500);
  }
});

// ---------- Broadcasts ----------

type BroadcastBody = {
  guide_id?: string;
  title?: string;
  teaser?: string;
  cover_url?: string;
  button_text?: string;
};

function buildMiniappUrl(env: Env, slug: string): string {
  // Direct miniapp URL with ?guide=<slug> — used for inline web_app buttons,
  // which open the miniapp inside Telegram without requiring a named webapp.
  const safeSlug = slug.replace(/[^a-z0-9_-]/gi, '');
  return `${env.GUIDES_ORIGIN.replace(/\/$/, '')}/?guide=${safeSlug}`;
}

function buildCaption(title: string, teaser: string): string {
  return `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(teaser)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

app.get('/api/admin/broadcast/audience', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  if (!isAdmin(c)) return c.json({ error: 'forbidden' }, 403);
  const count = await countNotifiableUsers(c.env.DB);
  return c.json({ count });
});

app.get('/api/admin/broadcast', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  if (!isAdmin(c)) return c.json({ error: 'forbidden' }, 403);
  const rows = await listBroadcasts(c.env.DB, 20);
  return c.json({ broadcasts: rows });
});

app.get('/api/admin/broadcast/:id', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  if (!isAdmin(c)) return c.json({ error: 'forbidden' }, 403);
  const id = parseInt(c.req.param('id'), 10);
  if (!id) return c.json({ error: 'invalid id' }, 400);
  const row = await getBroadcast(c.env.DB, id);
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json(row);
});

app.post('/api/admin/broadcast', async (c) => {
  const res = await requireAuth(c);
  if (res) return res;
  if (!isAdmin(c)) return c.json({ error: 'forbidden' }, 403);
  const user = c.get('user');

  const body = (await c.req.json<BroadcastBody>().catch(() => ({}))) as BroadcastBody;
  const guide_id = (body.guide_id || '').trim();
  const title = (body.title || '').trim();
  const teaser = (body.teaser || '').trim();
  const cover_url = (body.cover_url || '').trim();
  const button_text = (body.button_text || 'Открыть гайд').trim();

  if (!guide_id || !/^[a-z0-9-]+$/i.test(guide_id)) {
    return c.json({ error: 'invalid guide_id' }, 400);
  }
  if (!title || title.length > 200) return c.json({ error: 'invalid title' }, 400);
  if (!teaser || teaser.length > 900) return c.json({ error: 'invalid teaser' }, 400);
  if (cover_url && !/^https?:\/\//.test(cover_url)) {
    return c.json({ error: 'invalid cover_url' }, 400);
  }

  const startParam = `guide_${guide_id.replace(/[^a-z0-9_-]/gi, '')}`;

  const broadcastId = await createBroadcast(c.env.DB, {
    guide_id,
    title,
    teaser,
    cover_url: cover_url || null,
    button_text,
    start_param: startParam,
    created_by: user.id,
  });

  c.executionCtx.waitUntil(runBroadcast(c.env, broadcastId));
  return c.json({ ok: true, id: broadcastId });
});

async function runBroadcast(env: Env, broadcastId: number): Promise<void> {
  try {
    const row = await getBroadcast(env.DB, broadcastId);
    if (!row) return;
    const recipients = await listBroadcastRecipients(env.DB);
    await setBroadcastStatus(env.DB, broadcastId, 'sending', { recipients_total: recipients.length });

    const miniappUrl = buildMiniappUrl(env, row.guide_id);
    const caption = buildCaption(row.title, row.teaser);
    // web_app button opens the miniapp directly inside Telegram (only works
    // in private chats with the bot — which is exactly the broadcast case).
    const replyMarkup = {
      inline_keyboard: [[{ text: row.button_text, web_app: { url: miniappUrl } }]],
    };

    // Throttle to ~25 msg/sec — Telegram global cap is ~30/sec.
    const BATCH = 25;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const chunk = recipients.slice(i, i + BATCH);
      const t0 = Date.now();
      await Promise.all(
        chunk.map(async (tgId) => {
          const result = row.cover_url
            ? await sendPhoto(env.BOT_TOKEN, tgId, row.cover_url, caption, replyMarkup)
            : await sendMessage(env.BOT_TOKEN, tgId, caption, replyMarkup);
          if (result.ok) {
            await recordDelivery(env.DB, broadcastId, tgId, 'ok', null);
          } else {
            const kind = deliveryFailureType(result.status, result.description);
            await recordDelivery(env.DB, broadcastId, tgId, kind, `${result.status}: ${result.description}`);
          }
        }),
      );
      const elapsed = Date.now() - t0;
      if (i + BATCH < recipients.length && elapsed < 1000) {
        await new Promise((r) => setTimeout(r, 1000 - elapsed));
      }
    }

    await setBroadcastStatus(env.DB, broadcastId, 'done', { finished_at: Math.floor(Date.now() / 1000) });
  } catch (err) {
    console.error('[broadcast]', broadcastId, err);
    await setBroadcastStatus(env.DB, broadcastId, 'failed', {
      finished_at: Math.floor(Date.now() / 1000),
    });
  }
}

export default app;
