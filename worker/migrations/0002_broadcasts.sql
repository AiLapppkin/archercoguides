-- Phase 4: broadcasts (announce new guides to bot users)

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_id TEXT NOT NULL,
  title TEXT NOT NULL,
  teaser TEXT NOT NULL,
  cover_url TEXT,
  button_text TEXT NOT NULL,
  start_param TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sending|done|failed
  recipients_total INTEGER NOT NULL DEFAULT 0,
  recipients_sent INTEGER NOT NULL DEFAULT 0,
  recipients_failed INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts (created_at DESC);

CREATE TABLE IF NOT EXISTS broadcast_deliveries (
  broadcast_id INTEGER NOT NULL,
  tg_id INTEGER NOT NULL,
  status TEXT NOT NULL, -- ok|failed|blocked
  error TEXT,
  delivered_at INTEGER NOT NULL,
  PRIMARY KEY (broadcast_id, tg_id)
);
CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_status ON broadcast_deliveries (broadcast_id, status);
