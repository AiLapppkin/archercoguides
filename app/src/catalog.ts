import type { Guide } from './types';

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
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}guides/${slug}/content.html`);
  if (!res.ok) throw new Error(`Failed to load guide: ${res.status}`);
  return await res.text();
}
