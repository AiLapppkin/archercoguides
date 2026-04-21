import { getUser } from '../telegram';

export function Profile() {
  const user = getUser();

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

      <Placeholder
        icon="⭐"
        title="Купленные гайды"
        text="Доступно после интеграции Telegram Stars (Phase 3)."
      />
      <Placeholder
        icon="📖"
        title="История просмотров"
        text="Появится после подключения бэкенда (Phase 2)."
      />
      <Placeholder icon="❤️" title="Избранное" text="Скоро." />
    </div>
  );
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
