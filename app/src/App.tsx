import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './screens/Home';
import { Categories, CategoryView } from './screens/Categories';
import { Search } from './screens/Search';
import { Guide } from './screens/Guide';
import { Profile } from './screens/Profile';
import { initWebApp } from './telegram';

export default function App() {
  useEffect(() => {
    initWebApp();
  }, []);

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
