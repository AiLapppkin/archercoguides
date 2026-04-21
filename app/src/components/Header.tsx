import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getWebApp } from '../telegram';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '';

  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    const bb = wa.BackButton;
    if (isHome) {
      bb.hide();
    } else {
      const handler = () => navigate(-1);
      bb.onClick(handler);
      bb.show();
      return () => bb.offClick(handler);
    }
  }, [isHome, navigate]);

  return (
    <header className="sticky top-0 z-20 bg-obsidian-bg/85 backdrop-blur border-b border-obsidian-border">
      <div className="px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse-dot" />
          <span className="font-display font-bold text-[15px] tracking-tight text-obsidian-text group-hover:text-gold-bright transition-colors">
            ArcherCo
          </span>
          <span className="font-display font-bold text-[15px] tracking-tight text-gold">
            Guides
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 text-[13px] text-obsidian-dim font-medium">
          <Link to="/search" className="hover:text-gold transition-colors">Поиск</Link>
          <Link to="/categories" className="hover:text-gold transition-colors">Категории</Link>
          <Link to="/profile" className="hover:text-gold transition-colors">Профиль</Link>
        </nav>
      </div>
    </header>
  );
}
