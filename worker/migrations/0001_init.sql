-- Phase 2 initial schema (matches spec section 8)

CREATE TABLE IF NOT EXISTS users (
  tg_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  notifications_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id INTEGER NOT NULL,
  guide_id TEXT NOT NULL,
  stars_paid INTEGER NOT NULL,
  telegram_payment_charge_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_tg ON purchases (tg_id);

CREATE TABLE IF NOT EXISTS views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id INTEGER NOT NULL,
  guide_id TEXT NOT NULL,
  viewed_at INTEGER NOT NULL,
  duration_sec INTEGER
);
CREATE INDEX IF NOT EXISTS idx_views_tg ON views (tg_id);
CREATE INDEX IF NOT EXISTS idx_views_guide ON views (guide_id);

CREATE TABLE IF NOT EXISTS favorites (
  tg_id INTEGER NOT NULL,
  guide_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tg_id, guide_id)
);
