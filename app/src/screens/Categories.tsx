import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadCatalog } from '../catalog';
import { GuideCard } from '../components/GuideCard';
import type { Guide } from '../types';

const CATEGORY_LABELS: Record<string, { title: string; emoji: string }> = {
  'claude-code': { title: 'Claude Code', emoji: '🤖' },
  'ai-insights': { title: 'AI и индустрия', emoji: '🧠' },
  'prompting': { title: 'Промпты', emoji: '✍️' },
  'productivity': { title: 'Продуктивность', emoji: '⚡' },
};

export function Categories() {
  const [guides, setGuides] = useState<Guide[]>([]);
  useEffect(() => {
    loadCatalog().then(setGuides);
  }, []);

  const counts = guides.reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = (acc[g.category] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.keys(counts).sort();

  return (
    <div className="p-5 pb-20">
      <h2 className="font-display font-bold text-xl tracking-tight mb-5">
        <span className="text-gold-gradient">Категории</span>
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const label = CATEGORY_LABELS[cat] || { title: cat, emoji: '📘' };
          return (
            <Link
              key={cat}
              to={`/category/${cat}`}
              className="group relative bg-obsidian-card border border-obsidian-border rounded-2xl p-4 flex flex-col items-start gap-2 hover:border-gold/40 hover:bg-obsidian-cardHover transition-all duration-300 hover:-translate-y-0.5 hover:shadow-gold-sm overflow-hidden"
            >
              <div className="text-3xl">{label.emoji}</div>
              <div className="font-display font-semibold text-[14px] text-obsidian-text group-hover:text-gold-bright transition-colors">
                {label.title}
              </div>
              <div className="text-[11px] font-mono text-obsidian-dim">
                {counts[cat]} {pluralize(counts[cat])}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function pluralize(n: number) {
  if (n === 1) return 'гайд';
  if (n >= 2 && n <= 4) return 'гайда';
  return 'гайдов';
}

export function CategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const [guides, setGuides] = useState<Guide[]>([]);
  useEffect(() => {
    loadCatalog().then(setGuides);
  }, []);

  const filtered = guides.filter((g) => g.category === slug);
  const label = CATEGORY_LABELS[slug || ''] || { title: slug, emoji: '📘' };

  return (
    <div className="p-5 pb-20 space-y-4">
      <div>
        <div className="text-[11px] font-mono text-gold uppercase tracking-widest mb-1">
          Категория
        </div>
        <h2 className="font-display font-bold text-2xl tracking-tight">
          <span className="mr-2">{label.emoji}</span>
          <span className="text-gold-gradient">{label.title}</span>
        </h2>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-obsidian-dim">В этой категории пока нет гайдов.</p>
        ) : (
          filtered.map((g) => <GuideCard key={g.id} guide={g} />)
        )}
      </div>
    </div>
  );
}
