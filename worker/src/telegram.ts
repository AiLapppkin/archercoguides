// Thin Telegram Bot API client used for broadcasts.

const TG_API = 'https://api.telegram.org';

export type InlineKeyboardButton =
  | { text: string; url: string }
  | { text: string; web_app: { url: string } };

export type SendResult = { ok: true } | { ok: false; status: number; description: string };

export async function sendPhoto(
  botToken: string,
  chatId: number,
  photoUrl: string,
  caption: string,
  replyMarkup?: { inline_keyboard: InlineKeyboardButton[][] },
): Promise<SendResult> {
  const res = await fetch(`${TG_API}/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
  return interpret(res);
}

export async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard: InlineKeyboardButton[][] },
): Promise<SendResult> {
  const res = await fetch(`${TG_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: replyMarkup,
    }),
  });
  return interpret(res);
}

async function interpret(res: Response): Promise<SendResult> {
  if (res.ok) return { ok: true };
  let description = '';
  try {
    const body = (await res.json()) as { description?: string };
    description = body.description || '';
  } catch {
    description = await res.text().catch(() => '');
  }
  return { ok: false, status: res.status, description };
}

// Telegram global broadcast guidance is ~30 msg/sec. We stay conservative.
export function deliveryFailureType(status: number, desc: string): 'blocked' | 'failed' {
  // 403 = bot blocked / user deactivated; treat as blocked (do not retry).
  if (status === 403) return 'blocked';
  if (/blocked|deactivated|chat not found/i.test(desc)) return 'blocked';
  return 'failed';
}
