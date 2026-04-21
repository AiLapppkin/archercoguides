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
    <div className="p-4 grid grid-cols-2 gap-3 pb-16">
      {categories.map((cat) => {
        const label = CATEGORY_LABELS[cat] || { title: cat, emoji: '📘' };
        return (
          <Link
            key={cat}
            to={`/category/${cat}`}
            className="bg-tg-secondaryBg rounded-xl p-4 flex flex-col items-start gap-2"
          >
            <div className="text-3xl">{label.emoji}</div>
            <div className="font-semibold">{label.title}</div>
            <div className="text-xs text-tg-hint">{counts[cat]} гайдов</div>
          </Link>
        );
      })}
    </div>
  );
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
    <div className="p-4 space-y-3 pb-16">
      <h2 className="text-xl font-bold">{label.emoji} {label.title}</h2>
      {filtered.length === 0 ? (
        <p className="text-tg-hint">В этой категории пока нет гайдов.</p>
      ) : (
        filtered.map((g) => <GuideCard key={g.id} guide={g} />)
      )}
    </div>
  );
}
