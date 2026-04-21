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

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!guides) return <div className="p-6 text-obsidian-dim">Загрузка…</div>;
  if (guides.length === 0) return <div className="p-6 text-obsidian-dim">Гайдов пока нет.</div>;

  const [hero, ...rest] = guides;
  const free = rest.filter((g) => !g.isPaid);
  const paid = rest.filter((g) => g.isPaid);

  return (
    <div className="pb-20">
      <section className="glow-radial relative px-5 pt-6 pb-8 overflow-hidden">
        <div className="relative z-[1] animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-gold-bright text-[11px] font-medium tracking-wider uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
            Последний гайд
          </span>
          <Link to={`/guide/${hero.slug}`} className="block group">
            <h1 className="font-display font-extrabold text-[28px] leading-[1.15] tracking-tight">
              <span className="text-gold-purple-gradient">{hero.title}</span>
            </h1>
            <p className="text-obsidian-dim text-[14px] mt-3 leading-relaxed line-clamp-3">
              {hero.description}
            </p>
            <div className="flex items-center gap-3 mt-5 text-[12px] font-mono text-obsidian-dim">
              <span>{hero.duration}</span>
              <span className="text-obsidian-border">•</span>
              <span>{hero.publishedAt}</span>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 text-gold-bright font-display text-sm font-semibold group-hover:gap-3 transition-all">
              Читать <span>→</span>
            </div>
          </Link>
        </div>
      </section>

      <div className="px-4 space-y-8 mt-2">
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display font-semibold text-[11px] uppercase tracking-[0.12em] text-obsidian-dim mb-3 px-1">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
