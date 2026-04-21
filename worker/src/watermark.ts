const ZW_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];

/**
 * Encodes a Telegram user id as a zero-width-character sequence.
 * 40 bits is enough for all current Telegram IDs; we pad to 40 so
 * decoding is deterministic without a length prefix.
 */
function encodeIdToZeroWidth(userId: number): string {
  const bin = userId.toString(2).padStart(40, '0');
  let out = '';
  for (let i = 0; i < bin.length; i += 2) {
    const pair = bin.slice(i, i + 2);
    out += ZW_CHARS[parseInt(pair, 2)];
  }
  return out;
}

/**
 * Injects an invisible per-user fingerprint after every paragraph-level
 * closing tag in the supplied HTML. Survives plain-text copy-paste and
 * lets us trace leaks back to a user id without visibly changing the page.
 */
export function injectZeroWidthWatermark(html: string, userId: number): string {
  const marker = encodeIdToZeroWidth(userId);
  return html.replace(/(<\/p>|<\/li>|<\/h[1-6]>|<\/blockquote>|<\/td>)/gi, (m) => marker + m);
}
