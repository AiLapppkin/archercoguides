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
