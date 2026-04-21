import { Link } from 'react-router-dom';
import type { Guide } from '../types';

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      to={`/guide/${guide.slug}`}
      className="group block p-4 rounded-2xl bg-obsidian-card border border-obsidian-border hover:border-gold/40 hover:bg-obsidian-cardHover transition-all duration-300 hover:-translate-y-0.5 hover:shadow-gold-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[15px] leading-tight line-clamp-2 text-obsidian-text group-hover:text-gold-bright transition-colors">
            {guide.title}
          </h3>
          <p className="text-[13px] text-obsidian-dim line-clamp-2 mt-1.5 leading-relaxed">
            {guide.description}
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] font-mono">
            <span className="text-obsidian-dim">{guide.duration}</span>
            <span className="text-obsidian-border">•</span>
            {guide.isPaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/10 text-gold-bright border border-gold/20">
                ⭐ {guide.priceStars}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Бесплатно
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
