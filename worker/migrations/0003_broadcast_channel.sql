-- Phase 5: dual-target broadcasts (also post to a public Telegram channel)
-- channel_status: NULL = not attempted, 'ok' | 'failed' | 'disabled'
ALTER TABLE broadcasts ADD COLUMN channel_status TEXT;
ALTER TABLE broadcasts ADD COLUMN channel_error TEXT;
