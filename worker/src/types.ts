export type Env = {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  BOT_TOKEN: string;
  GUIDES_ORIGIN: string;
  ALLOWED_ORIGIN: string;
  INITDATA_TTL_SECONDS: string;
  RATE_LIMIT_PER_MINUTE: string;
  ADMIN_TG_IDS: string;
  BOT_USERNAME: string;
  MINIAPP_NAME: string;
  BROADCAST_CHANNEL: string;
};

export type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
};

export type AuthedContextVars = {
  user: TgUser;
  initDataAuthDate: number;
};
