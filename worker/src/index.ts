import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env, TgUser } from './types';
import { validateInitData } from './auth';
import { injectZeroWidthWatermark } from './watermark';
import { rateLimit } from './rate-limit';
import {
  listFavorites,
  listPurchases,
  logView,
  toggleFavorite,
  upsertUser,
} from './db';

type Vars = {
  user: TgUser;
  authDate: number;
};

type AppEnv = { Bindings: Env; Variables: Vars };
type Ctx = Context<AppEnv>;

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN;
  return cors({
    origin: [origin, 'http://localhost:5173'],
    allowHeaders: ['Content-Type', 'X-TG-Init-Data'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  })(c, next);
});

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

export default app;
