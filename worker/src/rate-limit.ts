/**
 * Simple fixed-window rate limit backed by Cloudflare KV.
 * Key: `rl:<bucket>:<tgId>:<minute>` — value: current count.
 * Returns `true` if the request is allowed, `false` if over the limit.
 */
export async function rateLimit(
  kv: KVNamespace,
  bucket: string,
  tgId: number,
  limitPerMinute: number,
): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60_000);
  const key = `rl:${bucket}:${tgId}:${minute}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= limitPerMinute) return false;
  // 120s TTL to cover slight clock skew — expired keys evaporate automatically
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}
