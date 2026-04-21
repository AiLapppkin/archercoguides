import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { loadCatalog } from '../catalog';
import { GuideCard } from '../components/GuideCard';
import type { Guide } from '../types';

export function Search() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');

  useEffect(() => {
    loadCatalog().then(setGuides);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(guides, {
        keys: ['title', 'description', 'tags', 'category'],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [guides],
  );

  const base = query.trim() ? fuse.search(query).map((r) => r.item) : guides;
  const results = base.filter((g) => {
    if (filter === 'free') return !g.isPaid;
    if (filter === 'paid') return g.isPaid;
    return true;
  });

  return (
    <div className="p-4 space-y-3 pb-16">
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по гайдам…"
        className="w-full rounded-xl bg-tg-secondaryBg px-4 py-3 outline-none"
      />
      <div className="flex gap-2 text-sm">
        {(['all', 'free', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full ${
              filter === f ? 'bg-tg-button text-tg-buttonText' : 'bg-tg-secondaryBg text-tg-hint'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'free' ? 'Бесплатно' : 'Премиум'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {results.length === 0 ? (
          <p className="text-tg-hint">Ничего не найдено.</p>
        ) : (
          results.map((g) => <GuideCard key={g.id} guide={g} />)
        )}
      </div>
    </div>
  );
}
