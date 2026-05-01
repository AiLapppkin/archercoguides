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

export type BroadcastRow = {
  id: number;
  guide_id: string;
  title: string;
  teaser: string;
  cover_url: string | null;
  button_text: string;
  start_param: string;
  status: string;
  recipients_total: number;
  recipients_sent: number;
  recipients_failed: number;
  created_at: number;
  finished_at: number | null;
  channel_status: string | null;
  channel_error: string | null;
};

export async function fetchBroadcastAudience(): Promise<{ count: number }> {
  return req<{ count: number }>('/api/admin/broadcast/audience');
}

export async function fetchBroadcasts(): Promise<BroadcastRow[]> {
  const r = await req<{ broadcasts: BroadcastRow[] }>('/api/admin/broadcast');
  return r.broadcasts;
}

export async function fetchBroadcast(id: number): Promise<BroadcastRow> {
  return req<BroadcastRow>(`/api/admin/broadcast/${id}`);
}

export async function createBroadcast(input: {
  guide_id: string;
  title: string;
  teaser: string;
  cover_url?: string;
  button_text?: string;
}): Promise<{ ok: boolean; id: number }> {
  return req<{ ok: boolean; id: number }>('/api/admin/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
