import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCatalog } from '../catalog';
import { GuideCard } from '../components/GuideCard';
import type { Guide } from '../types';

export function Home() {
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog().then(setGuides).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!guides) return <div className="p-4 text-tg-hint">Загрузка…</div>;
  if (guides.length === 0) return <div className="p-4 text-tg-hint">Гайдов пока нет.</div>;

  const [hero, ...rest] = guides;
  const free = rest.filter((g) => !g.isPaid);
  const paid = rest.filter((g) => g.isPaid);

  return (
    <div className="p-4 space-y-6 pb-16">
      <Link to={`/guide/${hero.slug}`} className="block rounded-2xl bg-tg-secondaryBg p-5">
        <div className="text-xs text-tg-hint uppercase tracking-wide">Последний гайд</div>
        <h2 className="text-xl font-bold mt-1 leading-tight">{hero.title}</h2>
        <p className="text-sm text-tg-hint mt-2 line-clamp-3">{hero.description}</p>
        <div className="mt-3 text-sm text-tg-link">Читать →</div>
      </Link>

      {rest.length > 0 && (
        <Section title="Новое">
          {rest.slice(0, 5).map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </Section>
      )}

      {free.length > 0 && (
        <Section title="Бесплатное">
          {free.slice(0, 5).map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </Section>
      )}

      {paid.length > 0 && (
        <Section title="Премиум">
          {paid.slice(0, 5).map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-bold text-sm uppercase tracking-wide text-tg-hint mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
