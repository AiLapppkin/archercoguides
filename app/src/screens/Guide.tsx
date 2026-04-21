import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadCatalog, loadGuideContent } from '../catalog';
import { getUser, openExternal } from '../telegram';
import { injectZeroWidth, buildWatermarkDataUrl } from '../utils/watermark';
import type { Guide as GuideT } from '../types';

function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

export function Guide() {
  const { slug } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<GuideT | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadCatalog()
      .then((list) => {
        const g = list.find((x) => x.slug === slug);
        if (!g) throw new Error('Гайд не найден');
        setGuide(g);
        return loadGuideContent(slug);
      })
      .then((html) => {
        const user = getUser();
        const body = extractBody(html);
        setContent(injectZeroWidth(body, user?.id));
      })
      .catch((e) => setError(String(e)));
  }, [slug]);

  useEffect(() => {
    const user = getUser();
    if (!user) return;
    const tag = `@${user.username || 'user'} • ${String(user.id).slice(-4)}`;
    document.documentElement.style.setProperty('--wm-image', buildWatermarkDataUrl(tag));
    return () => {
      document.documentElement.style.removeProperty('--wm-image');
    };
  }, []);

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!guide || content === null) return <div className="p-4 text-tg-hint">Загрузка…</div>;

  return (
    <div className="pb-20">
      <div className="watermark-layer" />
      <div className="p-4 space-y-3">
        <div className="text-xs text-tg-hint uppercase tracking-wide">{guide.category}</div>
        <h1 className="text-2xl font-bold leading-tight">{guide.title}</h1>
        <p className="text-tg-hint">{guide.description}</p>
        <div className="flex gap-3 text-sm text-tg-hint">
          <span>{guide.duration}</span>
          <span>{guide.publishedAt}</span>
        </div>
        {guide.youtubeUrl && (
          <button
            onClick={() => openExternal(guide.youtubeUrl)}
            className="inline-block px-4 py-2 rounded-full bg-tg-button text-tg-buttonText text-sm"
          >
            ▶ Смотреть на YouTube
          </button>
        )}
      </div>
      <article
        className="guide-content px-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
