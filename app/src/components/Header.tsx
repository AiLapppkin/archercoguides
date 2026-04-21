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
    <header className="sticky top-0 z-10 bg-tg-bg/90 backdrop-blur border-b border-tg-secondaryBg">
      <div className="px-4 py-3 flex items-center gap-3">
        <Link to="/" className="font-bold text-lg">ArcherCo Guides</Link>
        <div className="ml-auto flex gap-2">
          <Link to="/search" className="text-tg-link text-sm">Поиск</Link>
          <Link to="/categories" className="text-tg-link text-sm">Категории</Link>
          <Link to="/profile" className="text-tg-link text-sm">Профиль</Link>
        </div>
      </div>
    </header>
  );
}
