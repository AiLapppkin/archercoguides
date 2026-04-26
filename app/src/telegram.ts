import type { TelegramUser } from './types';

export function getWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
}

export function getUser(): TelegramUser | undefined {
  return getWebApp()?.initDataUnsafe.user;
}

export function getStartParam(): string | undefined {
  const raw = getWebApp()?.initDataUnsafe.start_param;
  return typeof raw === 'string' ? raw : undefined;
}

export function initWebApp() {
  const wa = getWebApp();
  if (!wa) return;
  wa.ready();
  wa.expand();
}

export function hapticLight() {
  getWebApp()?.HapticFeedback.impactOccurred('light');
}

export function openExternal(url: string) {
  const wa = getWebApp();
  if (wa?.openLink) wa.openLink(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
