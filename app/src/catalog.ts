import type { Guide } from './types';
import { fetchGuideContent } from './api';

let cache: Guide[] | null = null;

export async function loadCatalog(): Promise<Guide[]> {
  if (cache) return cache;
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}catalog.json`);
  if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
  cache = (await res.json()) as Guide[];
  return cache;
}

export async function loadGuideContent(slug: string): Promise<string> {
  // Prefer authenticated fetch through Worker (adds per-user watermark,
  // logs views, enforces rate limit). Falls back to direct Pages fetch
  // for desktop preview or if the Worker is unavailable.
  const viaApi = await fetchGuideContent(slug);
  if (viaApi !== null) return viaApi;

  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}guides/${slug}/content.html`);
  if (!res.ok) throw new Error(`Failed to load guide: ${res.status}`);
  return await res.text();
}
