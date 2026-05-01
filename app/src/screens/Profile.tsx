import { useEffect, useMemo, useState } from 'react';
import { getUser } from '../telegram';
import {
  createBroadcast,
  fetchAdminStats,
  fetchBroadcastAudience,
  fetchBroadcasts,
  type AdminStats,
  type BroadcastRow,
} from '../api';
import { loadCatalog } from '../catalog';
import type { Guide } from '../types';



const ADMIN_TG_ID = 161799016;

export function Profile() {
  const user = getUser();
  const isAdmin = user?.id === ADMIN_TG_ID;

  return (
    <div className="p-5 space-y-4 pb-20">
      <section className="glow-radial-gold relative bg-obsidian-card border border-obsidian-border rounded-2xl p-6 overflow-hidden">
        <div className="relative z-[1]">
          <div className="text-[11px] font-mono text-gold uppercase tracking-widest mb-2">
            Профиль
          </div>
          {user ? (
            <>
              <div className="font-display font-extrabold text-2xl tracking-tight">
                <span className="text-gold-gradient">
                  {user.first_name} {user.last_name || ''}
                </span>
              </div>
              {user.username && (
                <div className="text-obsidian-dim text-sm mt-1 font-mono">@{user.username}</div>
              )}
            </>
          ) : (
            <div className="text-obsidian-dim mt-1 text-sm">
              Открой приложение через Telegram, чтобы увидеть профиль.
            </div>
          )}
        </div>
      </section>

      {isAdmin && <AdminPanel />}
      {isAdmin && <BroadcastPanel />}

      <Placeholder icon="⭐" title="Купленные гайды" text="Скоро." />
      <Placeholder icon="📖" title="История просмотров" text="Скоро." />
      <Placeholder icon="❤️" title="Избранное" text="Скоро." />
    </div>
  );
}

function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAdminStats()
      .then(setStats)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [tick]);

  return (
    <section className="space-y-3">
      <div className="text-[11px] font-mono text-gold uppercase tracking-widest px-1">
        Admin
      </div>

      {loading && (
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-4 text-obsidian-dim text-sm">
          Загрузка...
        </div>
      )}

      {error && (
        <div className="bg-obsidian-card border border-red-800 rounded-xl p-4 space-y-2">
          <div className="text-red-400 text-[12px] font-mono break-all">{error}</div>
          <button
            onClick={() => setTick((t) => t + 1)}
            style={{ touchAction: 'manipulation' }}
            className="text-[12px] text-gold rounded-lg px-3 py-1 active:opacity-60"
            type="button"
          >
            Повторить
          </button>
        </div>
      )}

      {stats && (
        <>
          {stats.updatedAt && (
            <div className="text-obsidian-dim text-[11px] font-mono px-1">
              обновлено {formatTime(stats.updatedAt)}
            </div>
          )}
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Пользователей" value={stats.totalUsers} />
            <StatCard label="Просмотров" value={stats.totalViews} />
            <StatCard label="Новых / 7д" value={stats.newUsersLast7d} />
          </div>

          {/* Top guides */}
          {stats.topGuides.length > 0 && (
            <div className="bg-obsidian-card border border-obsidian-border rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-obsidian-border text-[11px] font-mono text-gold uppercase tracking-widest">
                Топ гайды
              </div>
              <div className="divide-y divide-obsidian-border">
                {stats.topGuides.map((g) => (
                  <div key={g.guide_id} className="flex items-center justify-between px-4 py-2">
                    <span className="text-obsidian-text text-[13px] font-mono truncate max-w-[200px]">
                      {g.guide_id}
                    </span>
                    <span className="text-gold text-[13px] font-mono ml-2 shrink-0">
                      {g.view_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {stats.recentViews.length > 0 && (
            <div className="bg-obsidian-card border border-obsidian-border rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-obsidian-border text-[11px] font-mono text-gold uppercase tracking-widest">
                Последние просмотры
              </div>
              <div className="divide-y divide-obsidian-border">
                {stats.recentViews.map((v, i) => (
                  <div key={i} className="px-4 py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-obsidian-text text-[13px] truncate">
                        {v.first_name || v.username || `id:${v.tg_id}`}
                        {v.username && (
                          <span className="text-obsidian-dim ml-1">@{v.username}</span>
                        )}
                      </div>
                      <div className="text-obsidian-dim text-[11px] font-mono truncate">
                        {v.guide_id}
                      </div>
                    </div>
                    <div className="text-obsidian-dim text-[11px] font-mono shrink-0">
                      {formatTime(v.viewed_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-3 text-center">
      <div className="font-display font-extrabold text-xl text-gold">{value}</div>
      <div className="text-obsidian-dim text-[11px] mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin}м назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}ч назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function BroadcastPanel() {
  const [catalog, setCatalog] = useState<Guide[]>([]);
  const [audience, setAudience] = useState<number | null>(null);
  const [history, setHistory] = useState<BroadcastRow[]>([]);

  const [guideSlug, setGuideSlug] = useState('');
  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [buttonText, setButtonText] = useState('Открыть гайд');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    fetchBroadcastAudience()
      .then((r) => setAudience(r.count))
      .catch(() => setAudience(null));
    fetchBroadcasts()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [tick]);

  const selectedGuide = useMemo(
    () => catalog.find((g) => g.slug === guideSlug),
    [catalog, guideSlug],
  );

  function pickGuide(slug: string) {
    setGuideSlug(slug);
    const g = catalog.find((x) => x.slug === slug);
    if (g) {
      setTitle(g.title);
      setTeaser(g.description);
      setCoverUrl(g.coverUrl ? absoluteUrl(g.coverUrl) : '');
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await createBroadcast({
        guide_id: guideSlug,
        title: title.trim(),
        teaser: teaser.trim(),
        cover_url: coverUrl.trim() || undefined,
        button_text: buttonText.trim() || 'Открыть гайд',
      });
      setConfirm(false);
      // Reset form
      setGuideSlug('');
      setTitle('');
      setTeaser('');
      setCoverUrl('');
      setButtonText('Открыть гайд');
      // Refresh history; runner is async on Worker side.
      setTimeout(() => setTick((t) => t + 1), 1500);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const valid =
    !!guideSlug &&
    title.trim().length > 0 &&
    title.trim().length <= 200 &&
    teaser.trim().length > 0 &&
    teaser.trim().length <= 900 &&
    (coverUrl.trim() === '' || /^https?:\/\//.test(coverUrl.trim()));

  return (
    <section className="space-y-3">
      <div className="text-[11px] font-mono text-gold uppercase tracking-widest px-1">
        Рассылка
      </div>

      <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-4 space-y-3">
        <div className="text-obsidian-dim text-[12px]">
          Получателей с включёнными уведомлениями:{' '}
          <span className="text-gold font-mono">{audience ?? '—'}</span>
        </div>

        <Field label="Гайд">
          <select
            value={guideSlug}
            onChange={(e) => pickGuide(e.target.value)}
            className="w-full bg-obsidian-bg border border-obsidian-border rounded-lg px-3 py-2 text-[13px] text-obsidian-text"
          >
            <option value="">— выбрать —</option>
            {catalog.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Заголовок (${title.length}/200)`}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full bg-obsidian-bg border border-obsidian-border rounded-lg px-3 py-2 text-[13px] text-obsidian-text"
          />
        </Field>

        <Field label={`Тизер (${teaser.length}/900)`}>
          <textarea
            value={teaser}
            onChange={(e) => setTeaser(e.target.value)}
            maxLength={900}
            rows={4}
            className="w-full bg-obsidian-bg border border-obsidian-border rounded-lg px-3 py-2 text-[13px] text-obsidian-text resize-y"
          />
        </Field>

        <Field label="URL обложки (необязательно, 1280×720+)">
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-obsidian-bg border border-obsidian-border rounded-lg px-3 py-2 text-[13px] text-obsidian-text font-mono"
          />
        </Field>

        <Field label="Текст кнопки">
          <input
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            maxLength={64}
            className="w-full bg-obsidian-bg border border-obsidian-border rounded-lg px-3 py-2 text-[13px] text-obsidian-text"
          />
        </Field>

        {selectedGuide && (
          <BroadcastPreview
            title={title}
            teaser={teaser}
            coverUrl={coverUrl}
            buttonText={buttonText}
          />
        )}

        {error && (
          <div className="text-red-400 text-[12px] font-mono break-all">{error}</div>
        )}

        {!confirm ? (
          <button
            type="button"
            disabled={!valid || submitting}
            onClick={() => setConfirm(true)}
            style={{ touchAction: 'manipulation' }}
            className="w-full bg-gold text-black font-display font-bold rounded-lg py-2.5 text-[14px] active:opacity-70 disabled:opacity-30"
          >
            Анонсировать
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-obsidian-text text-[12px]">
              Отправить{' '}
              <span className="text-gold font-mono">{audience ?? '—'}</span> пользователям?
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 bg-gold text-black font-display font-bold rounded-lg py-2 text-[13px] active:opacity-70 disabled:opacity-30"
              >
                {submitting ? 'Запуск...' : 'Подтвердить'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirm(false)}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 bg-obsidian-bg border border-obsidian-border rounded-lg py-2 text-[13px] text-obsidian-dim active:opacity-70"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-obsidian-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-gold uppercase tracking-widest">
              История
            </span>
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              className="text-[11px] text-obsidian-dim font-mono active:opacity-60"
            >
              ↻
            </button>
          </div>
          <div className="divide-y divide-obsidian-border">
            {history.map((b) => (
              <BroadcastHistoryRow key={b.id} row={b} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BroadcastPreview({
  title,
  teaser,
  coverUrl,
  buttonText,
}: {
  title: string;
  teaser: string;
  coverUrl: string;
  buttonText: string;
}) {
  return (
    <div className="border border-obsidian-border rounded-lg overflow-hidden bg-obsidian-bg">
      {coverUrl && /^https?:\/\//.test(coverUrl) && (
        <img
          src={coverUrl}
          alt=""
          className="w-full aspect-[1280/720] object-cover bg-obsidian-card"
          onError={(e) => ((e.currentTarget.style.display = 'none'))}
        />
      )}
      <div className="p-3 space-y-2">
        <div className="font-display font-bold text-[14px] text-obsidian-text">
          {title || 'Заголовок'}
        </div>
        <div className="text-obsidian-dim text-[12px] whitespace-pre-wrap">
          {teaser || 'Текст тизера'}
        </div>
        <div className="border border-gold rounded-md py-1.5 text-center text-gold text-[12px] font-display font-semibold">
          {buttonText || 'Открыть гайд'}
        </div>
      </div>
    </div>
  );
}

function BroadcastHistoryRow({ row }: { row: BroadcastRow }) {
  const statusColor =
    row.status === 'done'
      ? 'text-emerald-400'
      : row.status === 'sending'
        ? 'text-gold'
        : row.status === 'failed'
          ? 'text-red-400'
          : 'text-obsidian-dim';
  return (
    <div className="px-4 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-obsidian-text text-[13px] truncate">{row.title}</span>
        <span className={`text-[11px] font-mono shrink-0 ${statusColor}`}>{row.status}</span>
      </div>
      <div className="flex items-center justify-between text-obsidian-dim text-[11px] font-mono">
        <span>
          {row.recipients_sent}/{row.recipients_total}
          {row.recipients_failed > 0 && (
            <span className="text-red-400"> ✕{row.recipients_failed}</span>
          )}
          {row.channel_status && (
            <span
              className={
                row.channel_status === 'ok'
                  ? 'text-emerald-400 ml-2'
                  : row.channel_status === 'failed'
                    ? 'text-red-400 ml-2'
                    : 'text-obsidian-dim ml-2'
              }
              title={row.channel_error ?? undefined}
            >
              {row.channel_status === 'ok'
                ? '📣 channel ok'
                : row.channel_status === 'failed'
                  ? '📣 channel ✕'
                  : '📣 channel off'}
            </span>
          )}
        </span>
        <span>{formatTime(row.created_at)}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-obsidian-dim text-[11px] font-mono uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}

function absoluteUrl(maybeRelative: string): string {
  if (/^https?:\/\//.test(maybeRelative)) return maybeRelative;
  return `${window.location.origin}${maybeRelative.startsWith('/') ? '' : '/'}${maybeRelative}`;
}

function Placeholder({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-4 flex gap-3">
      <div className="text-xl">{icon}</div>
      <div className="flex-1">
        <h3 className="font-display font-semibold text-[14px] text-obsidian-text">{title}</h3>
        <p className="text-[12px] text-obsidian-dim mt-0.5 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
