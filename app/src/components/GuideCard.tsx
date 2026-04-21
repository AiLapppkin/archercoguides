import { Link } from 'react-router-dom';
import type { Guide } from '../types';

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      to={`/guide/${guide.slug}`}
      className="block p-4 rounded-xl bg-tg-secondaryBg hover:opacity-90 transition"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">{guide.title}</h3>
          <p className="text-sm text-tg-hint line-clamp-2 mt-1">{guide.description}</p>
          <div className="flex gap-2 mt-2 text-xs text-tg-hint">
            <span>{guide.duration}</span>
            {guide.isPaid ? (
              <span className="text-tg-link">⭐ {guide.priceStars}</span>
            ) : (
              <span>Бесплатно</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
