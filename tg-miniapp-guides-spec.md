# ТЗ: Telegram Mini App для публикации YouTube-гайдов

## 1. Цели продукта

Публикация YouTube-гайдов автора (существующие HTML + новые) в формате Telegram Mini App с:
- бесплатным и платным контентом (freemium)
- поиском и категориями
- защитой от кражи контента без ущерба UX
- возможностью масштабирования от десятков до сотен гайдов

## 2. Архитектура (рекомендуемая)

```
┌─────────────────────┐         ┌──────────────────────┐
│  Telegram Client    │◄───────►│  Telegram Bot        │
│  (Mini App WebView) │         │  (grammY, Node.js)   │
└─────────┬───────────┘         └──────────┬───────────┘
          │                                │
          │ initData (HMAC)                │ webhook
          ▼                                ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare Worker (API)                             │
│  - валидация initData                                │
│  - проверка доступа к гайдам                         │
│  - выдача подписанных URL для платного контента      │
│  - логирование просмотров                            │
└─────────┬──────────────────────────────┬────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────┐       ┌────────────────────────┐
│  Cloudflare D1       │       │  GitHub Pages          │
│  (users, purchases,  │       │  (статический фронт +  │
│   access logs)       │       │   бесплатные гайды)    │
└──────────────────────┘       └────────────────────────┘
                                          │
                                          ▼
                               ┌────────────────────────┐
                               │  Cloudflare R2         │
                               │  (платные гайды,       │
                               │   приватный доступ)    │
                               └────────────────────────┘
```

### Стек

| Слой | Технология | Почему |
|------|------------|--------|
| Фронт | Vite + React + TypeScript | Быстрая сборка, типы, экосистема |
| Telegram SDK | `@telegram-apps/sdk-react` | Официальный, поддерживает Stars |
| Стили | Tailwind CSS | Скорость разработки |
| Роутер | React Router | Категории/поиск/гайды |
| Хостинг фронта | **GitHub Pages** | Бесплатно, CI/CD через Actions |
| API | Cloudflare Workers | Бесплатно до 100k req/день |
| БД | Cloudflare D1 (SQLite) | Бесплатно до 5GB |
| Приватные файлы | Cloudflare R2 | Бесплатно до 10GB, signed URLs |
| Бот | grammY (Node.js) на Cloudflare Workers | Единая платформа |
| Платежи | **Telegram Stars** | Нативно в Mini App, без KYC, глобально |

### Альтернатива без бэкенда (MVP)

Только GitHub Pages + статические JSON/HTML. Платный контент — через проверку `initData` прямо на клиенте + подписанные ссылки, выдаваемые ботом. Подходит для старта с <50 пользователей.

**Рекомендация:** начать с бэкенда на Cloudflare Workers сразу — он бесплатный, а миграция потом болезненна.

## 3. Контент-пайплайн

### Единый формат гайда

Все гайды (старые HTML и новые) приводятся к структуре:

```
guides/
  slug-name-here/
    meta.json          # title, description, category, tags, isPaid, price, cover
    content.html       # тело гайда (уже готовое или сгенерированное)
    cover.jpg          # обложка 1200x630
    assets/            # изображения, если есть
```

`meta.json`:
```json
{
  "id": "yt-guide-001",
  "slug": "how-to-use-claude-code",
  "title": "Как использовать Claude Code",
  "description": "Краткое описание для карточки",
  "category": "claude-code",
  "tags": ["ai", "tools", "productivity"],
  "youtubeUrl": "https://youtube.com/watch?v=...",
  "isPaid": false,
  "priceStars": 0,
  "duration": "15 мин чтения",
  "publishedAt": "2026-04-21",
  "coverUrl": "/guides/how-to-use-claude-code/cover.jpg"
}
```

### Источник контента

- **Существующие HTML** — складываем в `guides/*/content.html`, руками пишем `meta.json`
- **Новые гайды** — генерим через skill `youtube-to-notion` (уже есть), экспортируем в HTML

### Деплой контента

- Бесплатные гайды: коммит в репозиторий → GitHub Actions → GitHub Pages
- Платные гайды: коммит в приватный репо → GitHub Action загружает в R2 → доступ только по signed URL

## 4. UX / структура экранов

### 4.1. Главная
- Hero: последний гайд
- Горизонтальные полки: «Новое», «Популярное», «Бесплатное», «Премиум»
- Поиск в шапке (прилипающий)

### 4.2. Категории
- Сетка карточек категорий с иконками
- Клик → список гайдов в категории

### 4.3. Поиск
- Клиентский fuzzy-search по `meta.json` всех гайдов (через Fuse.js)
- Фильтры: бесплатно/платно, категория, теги

### 4.4. Страница гайда
- Обложка + заголовок + метаданные
- Для бесплатных: сразу контент
- Для платных: превью первых 20% + кнопка «Открыть за N ⭐»
- После покупки: полный контент
- Кнопка «Смотреть на YouTube» (ссылка на оригинал)
- Кнопка «Поделиться» (делится ссылкой на Mini App с deep link)

### 4.5. Профиль
- Купленные гайды
- История просмотров
- Избранное

## 5. Защита контента

**Принцип:** многослойная защита, каждый слой недорого, но вместе создают сильный барьер.

### Слой 1: Невидимые цифровые отпечатки
- В тело каждого гайда при выдаче вшивается **zero-width-символьная последовательность** кодирующая Telegram user ID (невидимо глазу, остаётся при копипасте)
- При обнаружении утечки — можно доказать, кто слил
- **Влияние на UX: 0**

### Слой 2: Динамический водяной знак
- CSS `::before` с `position: fixed`, `opacity: 0.04-0.06`, содержит `@username` и last-4 digits ID, размазан по фону
- При скриншоте/фото экрана — бренд виден, в обычном чтении — почти незаметен
- **Влияние на UX: минимальное**

### Слой 3: Серверная валидация
- Платный контент отдаётся только по signed URL с TTL 5 минут
- URL привязан к Telegram user ID (проверяется на Worker)
- Прямая ссылка на R2 не работает без подписи
- **Влияние на UX: 0** (всё прозрачно)

### Слой 4: Rate limiting
- Не более 10 гайдов открывается с одного ID в минуту — защита от массового скрапинга
- **Влияние на UX: 0** для нормального пользователя

### Слой 5: Юридический
- Канонические ссылки в гайде на оригинальный пост в канале
- Регистрация авторства через n'RIS / Copytrust (депонирование) — 5 минут, работает в РФ
- Мониторинг: раз в неделю гугл-алерты по уникальным фразам

### Что НЕ делаем (портит UX)
- ❌ Отключение выделения текста, правой кнопки — раздражает, обходится за 2 клика
- ❌ Скриншот-детект — работает плохо, срабатывает ложно
- ❌ Обфускация HTML — ломает доступность и SEO
- ❌ DRM — overkill для гайдов

## 6. Монетизация (Telegram Stars)

### Почему Stars
- Нативно в Mini App, не нужен Stripe/ЮKassa/KYC
- Работает глобально, включая РФ
- Комиссия Telegram ~30%, но упрощение огромное
- Можно выводить в TON или фиат

### Модели
1. **Paid per guide** — покупка отдельного гайда (лучшее для начала)
2. **Пакет гайдов** — связанные гайды в категории
3. **Подписка** — помесячно доступ ко всему (через BotFather или свою логику)

### Реализация
- `openInvoice()` из Telegram SDK
- Webhook `pre_checkout_query` и `successful_payment` на Worker
- Запись в D1: `purchases (user_id, guide_id, stars, tx_id, created_at)`

## 7. Telegram Bot (компаньон к Mini App)

### Функции
- `/start` — приветствие + кнопка запуска Mini App
- `/start <guide_slug>` — deep link на конкретный гайд
- Уведомления о новых гайдах подписчикам (opt-in)
- Автоответ на `successful_payment` со ссылкой на купленный гайд
- `/my` — список покупок

### Публикация нового гайда
1. Автор коммитит `meta.json` + `content.html`
2. GitHub Action собирает сайт и деплоит
3. Action дёргает вебхук бота → бот постит карточку в канал (если гайд бесплатный) или уведомляет подписчиков «премиум-листа» (если платный)

## 8. Модель данных (D1)

```sql
CREATE TABLE users (
  tg_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  created_at INTEGER,
  last_seen_at INTEGER,
  notifications_enabled INTEGER DEFAULT 1
);

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id INTEGER,
  guide_id TEXT,
  stars_paid INTEGER,
  telegram_payment_charge_id TEXT UNIQUE,
  created_at INTEGER
);

CREATE TABLE views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id INTEGER,
  guide_id TEXT,
  viewed_at INTEGER,
  duration_sec INTEGER
);

CREATE TABLE favorites (
  tg_id INTEGER,
  guide_id TEXT,
  created_at INTEGER,
  PRIMARY KEY (tg_id, guide_id)
);
```

Каталог гайдов (`meta.json`) — в статике, не в БД. Так проще версионировать через Git.

## 9. API эндпойнты (Cloudflare Worker)

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/auth` | Валидация `initData`, создание сессии |
| GET | `/api/guides` | Каталог (публичная часть `meta.json`) |
| GET | `/api/guides/:id/content` | Контент гайда (проверка доступа, водяной знак) |
| POST | `/api/purchase/invoice` | Создание Telegram-инвойса |
| POST | `/api/purchase/webhook` | Обработка `successful_payment` |
| GET | `/api/me/purchases` | Список купленных |
| POST | `/api/favorites/:id` | Добавить в избранное |
| POST | `/api/views` | Записать просмотр |

### Валидация initData (критично для безопасности)

```ts
// Cloudflare Worker
async function validateInitData(initData: string, botToken: string): Promise<TgUser | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = await hmac('WebAppData', botToken);
  const computed = await hmacHex(secretKey, dataCheckString);
  return computed === hash ? JSON.parse(params.get('user')!) : null;
}
```

## 10. GitHub Pages — деплой

### Структура репозитория

```
/
├── .github/workflows/deploy.yml
├── app/                    # фронт (Vite + React)
│   ├── src/
│   ├── public/
│   └── package.json
├── guides/                 # контент
│   ├── guide-1/
│   └── guide-2/
├── scripts/
│   └── build-catalog.ts    # собирает guides/*/meta.json в catalog.json
└── worker/                 # Cloudflare Worker (отдельный деплой)
```

### GitHub Action

```yaml
name: Deploy Mini App
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: app
      - run: npx tsx ../scripts/build-catalog.ts
        working-directory: app
      - run: npm run build
        working-directory: app
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./app/dist
```

### Важно
- GitHub Pages работает только по HTTPS — годится для Telegram Mini App ✅
- Домен: `username.github.io/repo-name` или подключить свой
- Для кастомного домена: файл `CNAME` в `public/`

## 11. План реализации (фазы)

### Phase 1 — MVP (1-2 недели)
- [ ] Репозиторий на GitHub, базовая структура
- [ ] Vite + React + Telegram SDK, тестовый Mini App «Hello, user»
- [ ] Бот через BotFather, прикрутить Mini App URL
- [ ] 3-5 бесплатных гайдов в новом формате
- [ ] Список + страница гайда + поиск (клиентский)
- [ ] Деплой на GitHub Pages
- [ ] **Проверка:** открыть в Telegram, увидеть гайд

### Phase 2 — Бэкенд и защита (1 неделя)
- [ ] Cloudflare Worker + валидация initData
- [ ] D1 с миграциями
- [ ] Водяные знаки (zero-width + CSS)
- [ ] Rate limiting
- [ ] Логирование просмотров

### Phase 3 — Монетизация (3-5 дней)
- [ ] Telegram Stars интеграция
- [ ] Страница платного гайда с превью
- [ ] Webhook `successful_payment`
- [ ] Список покупок в профиле
- [ ] R2 + signed URLs для премиум-контента

### Phase 4 — Рост (ongoing)
- [ ] Уведомления о новых гайдах
- [ ] Реферальная программа (1 приглашённый = 1 бесплатный гайд)
- [ ] Аналитика (PostHog или свой в D1)
- [ ] Избранное, продолжение чтения

## 12. Секреты и переменные окружения

```
# Worker
BOT_TOKEN=                # от BotFather
D1_DATABASE_ID=
R2_BUCKET_NAME=
ADMIN_TG_IDS=             # для инвалидации кэша, бан-листа

# GitHub Actions
CF_API_TOKEN=             # для деплоя Worker
```

## 13. Риски и митигации

| Риск | Митигация |
|------|-----------|
| Telegram изменит API Mini App | Использовать официальный SDK, следить за changelog |
| Пользователь скачает HTML через DevTools | Водяные знаки + zero-width + юр.защита |
| Масштабирование контента замедлит сборку | При >200 гайдов — перейти на ISR/SSG постранично |
| Stars комиссия 30% высокая | Добавить прямые платежи через ЮKassa вторым способом при MVP→рост |
| GitHub Pages лимит 100GB/месяц | Мониторить; при достижении — переезд на CF Pages |

## 14. Что нужно от тебя для старта

1. Имя бота и юзернейм (через @BotFather)
2. GitHub-аккаунт + название репозитория
3. Cloudflare-аккаунт (бесплатный)
4. 3-5 готовых HTML-гайдов для первого наполнения
5. Логотип/иконка 512x512 для Mini App
6. Короткое описание канала/автора для onboarding-экрана
7. Решение по цене платных гайдов (в Stars: 1⭐ ≈ $0.013, т.е. гайд за 100⭐ ≈ $1.30)

## 15. Что НЕ входит в это ТЗ

- Видеоплеер внутри Mini App (гайды — текстовые, на видео ссылка на YouTube)
- Комментарии (делаются нативно в ТГ-канале)
- Мультиязычность (пока RU-only)
- Нативные iOS/Android приложения (Mini App закрывает задачу)

---

**Готово к старту.** Передавай это ТЗ в новый диалог — там Claude сможет начать реализацию с Phase 1.
