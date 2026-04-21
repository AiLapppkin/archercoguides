const ZW_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];

function encodeIdToZeroWidth(userId: number): string {
  const bin = userId.toString(2).padStart(40, '0');
  let out = '';
  for (let i = 0; i < bin.length; i += 2) {
    const pair = bin.slice(i, i + 2);
    out += ZW_CHARS[parseInt(pair, 2)];
  }
  return out;
}

export function injectZeroWidth(html: string, userId: number | undefined): string {
  if (!userId) return html;
  const marker = encodeIdToZeroWidth(userId);
  return html.replace(/(<\/p>|<\/li>|<\/h[1-6]>)/gi, (m) => marker + m);
}

export function buildWatermarkDataUrl(text: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <text x="200" y="100" text-anchor="middle" fill="currentColor" font-size="14" font-family="sans-serif" transform="rotate(-20 200 100)">${text}</text>
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}
