import { useEffect, useState } from 'react';
import { getUser } from '../telegram';
import { fetchAdminStats, type AdminStats } from '../api';

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

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="bg-obsidian-card border border-red-800 rounded-xl p-4 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {stats && (
        <>
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
