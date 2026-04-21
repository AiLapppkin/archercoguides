# archercoguides-api (Phase 2)

Cloudflare Worker: validates Telegram `initData`, serves free-guide content
with a per-user zero-width watermark, logs views, toggles favorites.

## One-time setup

Run these from `worker/`:

```bash
# 1. Install deps
npm install

# 2. Log in to Cloudflare (opens browser)
npx wrangler login

# 3. Create D1 database → copy the printed `database_id`
npx wrangler d1 create archercoguides-db
#   => paste the id into wrangler.toml under [[d1_databases]] database_id

# 4. Create KV namespace for rate limiting → copy the printed `id`
npx wrangler kv namespace create RATE_LIMIT
#   => paste into wrangler.toml under [[kv_namespaces]] id

# 5. Apply schema migration to the remote DB
npx wrangler d1 migrations apply archercoguides-db --remote

# 6. Store the Telegram bot token as an encrypted secret
npx wrangler secret put BOT_TOKEN
#   => paste the NEW token from @BotFather when prompted

# 7. First deploy
npx wrangler deploy
```

After `deploy`, Wrangler prints a public URL like
`https://archercoguides-api.<your-subdomain>.workers.dev` — copy it and paste
into `app/.env.production` as `VITE_API_BASE`.

## Day-to-day

- Deploy: `npm run deploy`
- Tail logs: `npm run tail`
- Local dev: `npm run dev` (needs `BOT_TOKEN` in `.dev.vars`)

## Deploying new migrations

```bash
# Add a new file e.g. migrations/0002_add_something.sql, then:
npx wrangler d1 migrations apply archercoguides-db --remote
```

## Local testing

Create `worker/.dev.vars`:

```
BOT_TOKEN=<your-token-only-for-local>
```

Then:

```bash
npm run dev
# → http://localhost:8787
```
