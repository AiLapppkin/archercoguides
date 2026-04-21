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
    <div className="p-5 space-y-4 pb-20">
      <h2 className="font-display font-bold text-xl tracking-tight">
        <span className="text-gold-gradient">Поиск</span>
      </h2>

      <div className="relative">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название, тег, категория…"
          className="w-full rounded-xl bg-obsidian-card border border-obsidian-border px-4 py-3 text-[14px] text-obsidian-text placeholder:text-obsidian-dim outline-none focus:border-gold/50 focus:shadow-gold-sm transition-all font-body"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'free', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium font-display border transition-all ${
              filter === f
                ? 'bg-gold/15 text-gold-bright border-gold/40'
                : 'bg-obsidian-card text-obsidian-dim border-obsidian-border hover:border-gold/20 hover:text-obsidian-text'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'free' ? 'Бесплатно' : 'Премиум'}
          </button>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        {results.length === 0 ? (
          <p className="text-obsidian-dim text-sm">Ничего не найдено.</p>
        ) : (
          results.map((g) => <GuideCard key={g.id} guide={g} />)
        )}
      </div>
    </div>
  );
}
