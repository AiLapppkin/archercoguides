import { getWebApp } from './telegram';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '');

export function apiAvailable(): boolean {
  return Boolean(API_BASE);
}

function buildHeaders(): HeadersInit {
  const wa = getWebApp();
  const initData = wa?.initData ?? '';
  return initData ? { 'X-TG-Init-Data': initData } : {};
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error('API base not configured');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path} ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function authSession(): Promise<{ ok: boolean } | null> {
  if (!apiAvailable()) return null;
  try {
    return await req('/api/auth', { method: 'POST' });
  } catch {
    return null;
  }
}

export async function fetchGuideContent(slug: string): Promise<string | null> {
  if (!API_BASE) return null;
  const wa = getWebApp();
  const initData = wa?.initData ?? '';
  if (!initData) return null;
  try {
    const res = await fetch(`${API_BASE}/api/guides/${slug}/content`, {
      headers: { 'X-TG-Init-Data': initData },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.warn('[api] fetchGuideContent failed, falling back to Pages:', err);
    return null;
  }
}

export async function toggleFavoriteApi(slug: string): Promise<boolean> {
  const r = await req<{ favorited: boolean }>(`/api/favorites/${slug}`, { method: 'POST' });
  return r.favorited;
}

export async function fetchFavorites(): Promise<string[]> {
  const r = await req<{ favorites: string[] }>('/api/me/favorites');
  return r.favorites;
}

export async function fetchPurchases(): Promise<
  Array<{ guide_id: string; stars_paid: number; created_at: number }>
> {
  const r = await req<{
    purchases: Array<{ guide_id: string; stars_paid: number; created_at: number }>;
  }>('/api/me/purchases');
  return r.purchases;
}

export type AdminStats = {
  totalUsers: number;
  totalViews: number;
  newUsersLast7d: number;
  topGuides: Array<{ guide_id: string; view_count: number }>;
  recentViews: Array<{
    tg_id: number;
    username: string | null;
    first_name: string | null;
    guide_id: string;
    viewed_at: number;
  }>;
  updatedAt?: number;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  if (!API_BASE) throw new Error('API не настроен');
  const wa = getWebApp();
  const initData = wa?.initData ?? '';
  if (!initData) throw new Error('Открой через Telegram');
  const url = `${API_BASE}/api/admin/stats?_init_data=${encodeURIComponent(initData)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body}`);
  }
  return (await res.json()) as AdminStats;
}
