import type { TgUser } from './types';

export async function upsertUser(db: D1Database, user: TgUser): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO users (tg_id, username, first_name, created_at, last_seen_at, notifications_enabled)
       VALUES (?1, ?2, ?3, ?4, ?4, 1)
       ON CONFLICT(tg_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         last_seen_at = excluded.last_seen_at`,
    )
    .bind(user.id, user.username ?? null, user.first_name ?? null, nowSec)
    .run();
}

export async function logView(
  db: D1Database,
  tgId: number,
  guideId: string,
  durationSec: number | null,
): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO views (tg_id, guide_id, viewed_at, duration_sec) VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(tgId, guideId, nowSec, durationSec ?? null)
    .run();
}

export async function toggleFavorite(
  db: D1Database,
  tgId: number,
  guideId: string,
): Promise<{ favorited: boolean }> {
  const existing = await db
    .prepare(`SELECT 1 FROM favorites WHERE tg_id = ?1 AND guide_id = ?2`)
    .bind(tgId, guideId)
    .first();
  if (existing) {
    await db
      .prepare(`DELETE FROM favorites WHERE tg_id = ?1 AND guide_id = ?2`)
      .bind(tgId, guideId)
      .run();
    return { favorited: false };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  await db
    .prepare(`INSERT INTO favorites (tg_id, guide_id, created_at) VALUES (?1, ?2, ?3)`)
    .bind(tgId, guideId, nowSec)
    .run();
  return { favorited: true };
}

export async function listFavorites(db: D1Database, tgId: number): Promise<string[]> {
  const rs = await db
    .prepare(`SELECT guide_id FROM favorites WHERE tg_id = ?1 ORDER BY created_at DESC`)
    .bind(tgId)
    .all<{ guide_id: string }>();
  return (rs.results ?? []).map((r) => r.guide_id);
}

export async function listPurchases(db: D1Database, tgId: number): Promise<
  Array<{ guide_id: string; stars_paid: number; created_at: number }>
> {
  const rs = await db
    .prepare(
      `SELECT guide_id, stars_paid, created_at FROM purchases WHERE tg_id = ?1 ORDER BY created_at DESC`,
    )
    .bind(tgId)
    .all<{ guide_id: string; stars_paid: number; created_at: number }>();
  return rs.results ?? [];
}

export type AdminStats = {
  totalUsers: number;
  totalViews: number;
  newUsersLast7d: number;
  topGuides: Array<{ guide_id: string; view_count: number }>;
  recentViews: Array<{ tg_id: number; username: string | null; first_name: string | null; guide_id: string; viewed_at: number }>;
};

export async function getAdminStats(db: D1Database): Promise<AdminStats> {
  const nowSec = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = nowSec - 7 * 24 * 3600;

  const usersRow = await db.prepare(`SELECT COUNT(*) AS cnt FROM users`).first<{ cnt: number }>();
  const viewsRow = await db.prepare(`SELECT COUNT(*) AS cnt FROM views`).first<{ cnt: number }>();
  const newUsersRow = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM users WHERE created_at >= ?1`)
    .bind(sevenDaysAgo)
    .first<{ cnt: number }>();
  const topGuidesRs = await db
    .prepare(`SELECT guide_id, COUNT(*) AS view_count FROM views GROUP BY guide_id ORDER BY view_count DESC LIMIT 10`)
    .all<{ guide_id: string; view_count: number }>();
  const recentViewsRs = await db
    .prepare(
      `SELECT v.tg_id, u.username, u.first_name, v.guide_id, v.viewed_at
       FROM views v LEFT JOIN users u ON u.tg_id = v.tg_id
       ORDER BY v.viewed_at DESC LIMIT 20`,
    )
    .all<{ tg_id: number; username: string | null; first_name: string | null; guide_id: string; viewed_at: number }>();

  return {
    totalUsers: usersRow?.cnt ?? 0,
    totalViews: viewsRow?.cnt ?? 0,
    newUsersLast7d: newUsersRow?.cnt ?? 0,
    topGuides: topGuidesRs.results ?? [],
    recentViews: recentViewsRs.results ?? [],
  };
}

// ---------- Broadcasts ----------

export type BroadcastInput = {
  guide_id: string;
  title: string;
  teaser: string;
  cover_url: string | null;
  button_text: string;
  start_param: string;
  created_by: number;
};

export type BroadcastRow = {
  id: number;
  guide_id: string;
  title: string;
  teaser: string;
  cover_url: string | null;
  button_text: string;
  start_param: string;
  status: string;
  recipients_total: number;
  recipients_sent: number;
  recipients_failed: number;
  created_by: number;
  created_at: number;
  finished_at: number | null;
  channel_status: string | null;
  channel_error: string | null;
};

export async function createBroadcast(db: D1Database, input: BroadcastInput): Promise<number> {
  const nowSec = Math.floor(Date.now() / 1000);
  const r = await db
    .prepare(
      `INSERT INTO broadcasts (guide_id, title, teaser, cover_url, button_text, start_param, status, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8) RETURNING id`,
    )
    .bind(
      input.guide_id,
      input.title,
      input.teaser,
      input.cover_url,
      input.button_text,
      input.start_param,
      input.created_by,
      nowSec,
    )
    .first<{ id: number }>();
  return r!.id;
}

export async function listBroadcastRecipients(db: D1Database): Promise<number[]> {
  const rs = await db
    .prepare(`SELECT tg_id FROM users WHERE notifications_enabled = 1 ORDER BY tg_id`)
    .all<{ tg_id: number }>();
  return (rs.results ?? []).map((r) => r.tg_id);
}

export async function setBroadcastStatus(
  db: D1Database,
  id: number,
  status: string,
  fields?: Partial<Pick<BroadcastRow, 'recipients_total' | 'finished_at'>>,
): Promise<void> {
  if (fields?.recipients_total !== undefined && fields?.finished_at !== undefined) {
    await db
      .prepare(`UPDATE broadcasts SET status = ?1, recipients_total = ?2, finished_at = ?3 WHERE id = ?4`)
      .bind(status, fields.recipients_total, fields.finished_at, id)
      .run();
  } else if (fields?.recipients_total !== undefined) {
    await db
      .prepare(`UPDATE broadcasts SET status = ?1, recipients_total = ?2 WHERE id = ?3`)
      .bind(status, fields.recipients_total, id)
      .run();
  } else if (fields?.finished_at !== undefined) {
    await db
      .prepare(`UPDATE broadcasts SET status = ?1, finished_at = ?2 WHERE id = ?3`)
      .bind(status, fields.finished_at, id)
      .run();
  } else {
    await db.prepare(`UPDATE broadcasts SET status = ?1 WHERE id = ?2`).bind(status, id).run();
  }
}

export async function recordDelivery(
  db: D1Database,
  broadcastId: number,
  tgId: number,
  status: 'ok' | 'failed' | 'blocked',
  error: string | null,
): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO broadcast_deliveries (broadcast_id, tg_id, status, error, delivered_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(broadcast_id, tg_id) DO UPDATE SET status = excluded.status, error = excluded.error, delivered_at = excluded.delivered_at`,
    )
    .bind(broadcastId, tgId, status, error, nowSec)
    .run();

  // Increment counters atomically.
  if (status === 'ok') {
    await db
      .prepare(`UPDATE broadcasts SET recipients_sent = recipients_sent + 1 WHERE id = ?1`)
      .bind(broadcastId)
      .run();
  } else {
    await db
      .prepare(`UPDATE broadcasts SET recipients_failed = recipients_failed + 1 WHERE id = ?1`)
      .bind(broadcastId)
      .run();
  }

  // If user is blocked — disable notifications so future broadcasts skip them.
  if (status === 'blocked') {
    await db
      .prepare(`UPDATE users SET notifications_enabled = 0 WHERE tg_id = ?1`)
      .bind(tgId)
      .run();
  }
}

export async function setChannelDeliveryStatus(
  db: D1Database,
  id: number,
  status: 'ok' | 'failed' | 'disabled',
  error: string | null,
): Promise<void> {
  await db
    .prepare(`UPDATE broadcasts SET channel_status = ?1, channel_error = ?2 WHERE id = ?3`)
    .bind(status, error, id)
    .run();
}

export async function getBroadcast(db: D1Database, id: number): Promise<BroadcastRow | null> {
  const r = await db
    .prepare(`SELECT * FROM broadcasts WHERE id = ?1`)
    .bind(id)
    .first<BroadcastRow>();
  return r ?? null;
}

export async function listBroadcasts(db: D1Database, limit = 20): Promise<BroadcastRow[]> {
  const rs = await db
    .prepare(`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT ?1`)
    .bind(limit)
    .all<BroadcastRow>();
  return rs.results ?? [];
}

export async function countNotifiableUsers(db: D1Database): Promise<number> {
  const r = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM users WHERE notifications_enabled = 1`)
    .first<{ cnt: number }>();
  return r?.cnt ?? 0;
}
