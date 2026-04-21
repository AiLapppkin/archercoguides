import type { TgUser } from './types';

const encoder = new TextEncoder();

async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type InitDataValidation =
  | { ok: true; user: TgUser; authDate: number }
  | { ok: false; reason: string };

/**
 * Validates Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns the parsed user and auth_date on success.
 */
export async function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): Promise<InitDataValidation> {
  if (!initData) return { ok: false, reason: 'missing initData' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'missing hash' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = await hmacSha256(encoder.encode('WebAppData'), botToken);
  const computedBuf = await hmacSha256(new Uint8Array(secretKey), dataCheckString);
  const computed = toHex(computedBuf);

  if (!timingSafeEqual(computed, hash.toLowerCase())) {
    return { ok: false, reason: 'bad hash' };
  }

  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw ? parseInt(authDateRaw, 10) : 0;
  if (!authDate) return { ok: false, reason: 'missing auth_date' };

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSeconds) {
    return { ok: false, reason: 'initData expired' };
  }

  const userJson = params.get('user');
  if (!userJson) return { ok: false, reason: 'missing user' };

  let user: TgUser;
  try {
    user = JSON.parse(userJson) as TgUser;
  } catch {
    return { ok: false, reason: 'malformed user' };
  }
  if (typeof user.id !== 'number') return { ok: false, reason: 'bad user.id' };

  return { ok: true, user, authDate };
}
