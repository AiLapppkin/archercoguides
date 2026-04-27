import { useEffect, useRef } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './screens/Home';
import { Categories, CategoryView } from './screens/Categories';
import { Search } from './screens/Search';
import { Guide } from './screens/Guide';
import { Profile } from './screens/Profile';
import { getStartParam, initWebApp } from './telegram';

export default function App() {
  const navigate = useNavigate();
  const handledDeepLink = useRef(false);
  useEffect(() => {
    initWebApp();
    if (handledDeepLink.current) return;
    handledDeepLink.current = true;
    const slug = resolveDeepLinkSlug();
    // Strip ?guide= from the URL so the deep-link does not re-fire on
    // subsequent route changes or miniapp relaunches from the menu.
    consumeGuideQueryParam();
    if (slug) navigate(`/guide/${slug}`, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<CategoryView />} />
          <Route path="/search" element={<Search />} />
          <Route path="/guide/:slug" element={<Guide />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<div className="p-4 text-tg-hint">404</div>} />
        </Routes>
      </main>
    </div>
  );
}

// Resolve a guide slug from either the Telegram start_param (when launched
// via t.me deep link) or the ?guide=<slug> query parameter (when launched
// from a web_app inline button on a broadcast). Returns null if neither
// applies or if the slug fails the safelist check.
function resolveDeepLinkSlug(): string | null {
  const start = getStartParam();
  if (start && start.startsWith('guide_')) {
    const slug = start.slice('guide_'.length);
    if (/^[a-z0-9-]+$/i.test(slug)) return slug;
  }
  const params = new URLSearchParams(window.location.search);
  const q = params.get('guide');
  if (q && /^[a-z0-9-]+$/i.test(q)) return q;
  return null;
}

function consumeGuideQueryParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('guide')) return;
  params.delete('guide');
  const search = params.toString();
  const newUrl =
    window.location.pathname + (search ? `?${search}` : '') + window.location.hash;
  history.replaceState(null, '', newUrl);
}
