import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadCatalog, loadGuideContent } from '../catalog';
import { getUser, openExternal } from '../telegram';
import { injectZeroWidth, buildWatermarkDataUrl } from '../utils/watermark';
import type { Guide as GuideT } from '../types';

function sanitizeContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
  body = body.replace(/<link[^>]*>/gi, '');
  return body;
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
        setContent(injectZeroWidth(sanitizeContent(html), user?.id));
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

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!guide || content === null) return <div className="p-6 text-obsidian-dim">Загрузка…</div>;

  return (
    <div className="pb-20">
      <div className="watermark-layer" />

      <section className="glow-radial relative px-5 pt-6 pb-6 overflow-hidden">
        <div className="relative z-[1] animate-fade-up space-y-4">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
            <span>{guide.category}</span>
          </div>

          <h1 className="font-display font-extrabold text-[26px] leading-[1.15] tracking-tight">
            <span className="text-gold-purple-gradient">{guide.title}</span>
          </h1>

          <p className="text-obsidian-dim text-[14px] leading-relaxed">
            {guide.description}
          </p>

          <div className="flex items-center gap-3 text-[12px] font-mono text-obsidian-dim">
            <span>{guide.duration}</span>
            <span className="text-obsidian-border">•</span>
            <span>{guide.publishedAt}</span>
            <span className="text-obsidian-border">•</span>
            {guide.isPaid ? (
              <span className="text-gold">⭐ {guide.priceStars}</span>
            ) : (
              <span className="text-emerald-400">Бесплатно</span>
            )}
          </div>

          {guide.youtubeUrl && (
            <button
              onClick={() => openExternal(guide.youtubeUrl)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 text-gold-bright border border-gold/30 text-[13px] font-display font-semibold hover:bg-gold/20 hover:border-gold/50 transition-all"
            >
              ▶ Смотреть на YouTube
            </button>
          )}
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-obsidian-border to-transparent mx-5" />

      <article
        className="guide-content px-5 pt-6"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
