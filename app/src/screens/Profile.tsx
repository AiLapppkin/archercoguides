import { getUser } from '../telegram';

export function Profile() {
  const user = getUser();

  return (
    <div className="p-4 space-y-4 pb-16">
      <div className="bg-tg-secondaryBg rounded-2xl p-5">
        <div className="text-xs text-tg-hint uppercase tracking-wide">Профиль</div>
        {user ? (
          <>
            <div className="text-xl font-bold mt-1">
              {user.first_name} {user.last_name || ''}
            </div>
            {user.username && <div className="text-tg-hint">@{user.username}</div>}
          </>
        ) : (
          <div className="text-tg-hint mt-1">
            Открой приложение через Telegram, чтобы увидеть профиль.
          </div>
        )}
      </div>

      <Placeholder title="Купленные гайды" text="Доступно в следующей фазе — после интеграции Telegram Stars." />
      <Placeholder title="История просмотров" text="Будет здесь после подключения бэкенда." />
      <Placeholder title="Избранное" text="Скоро." />
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-tg-secondaryBg rounded-xl p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-tg-hint mt-1">{text}</p>
    </div>
  );
}
