# Comments SPA

SPA-приложение для комментариев с каскадной системой ответов, real-time обновлениями и полнотекстовым поиском. Уровень реализации: **Middle+** (архитектура рассчитана на 1M сообщений, 100K пользователей/24ч).

Архитектура вдохновлена [Microsoft eShop](https://github.com/dotnet/eShop) — Clean Architecture, CQRS, Domain Events.

## Стек технологий

| Компонент | Технология |
|-----------|-----------|
| Backend | .NET 9, ASP.NET Core Web API |
| ORM | Entity Framework Core 9 |
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| База данных | PostgreSQL 17 |
| Кэш | Redis 7 |
| Брокер сообщений | RabbitMQ 4 (через MassTransit) |
| Поиск | Elasticsearch 8 |
| Real-time | SignalR (Redis backplane) |
| GraphQL | Hot Chocolate 14 |
| CAPTCHA | Кастомная (SkiaSharp) |
| Контейнеризация | Docker Compose |
| Нагрузочные тесты | NBomber |

## Структура проекта

```
├── src/
│   ├── Comments.Domain/              # Сущности, Value Objects, Domain Events, интерфейсы
│   ├── Comments.Application/         # CQRS (команды/запросы), DTO, валидаторы, MediatR
│   ├── Comments.Infrastructure/      # EF Core, Redis, RabbitMQ, Elasticsearch, SignalR
│   ├── Comments.API/                 # REST API, GraphQL, SignalR Hub, Middleware
│   └── Comments.WebApp/             # Next.js frontend (React 19, Tailwind CSS)
├── tests/
│   ├── Comments.UnitTests/
│   ├── Comments.IntegrationTests/
│   └── Comments.LoadTests/          # NBomber нагрузочные сценарии
├── docs/
│   └── db-schema.sql                # Схема БД (PostgreSQL)
├── docker-compose.yaml
├── Dockerfile.api
├── Dockerfile.web
└── Comments.sln
```

## Функциональность

### Комментарии
- Создание комментариев с полями: UserName, Email, HomePage (опционально), Text
- Каскадная (древовидная) система ответов с неограниченной вложенностью
- Пагинация по 25 комментариев на странице
- Сортировка по UserName, Email, дате создания (ASC/DESC)
- Порядок по умолчанию: LIFO (новые сверху)

### Безопасность
- CAPTCHA — кастомная генерация изображений через SkiaSharp, хранение ответов в Redis с TTL
- XSS-защита — HTML-санитизация (Ganss.XSS), разрешены только теги: `<a>`, `<code>`, `<i>`, `<strong>`
- Валидация закрытия XHTML-тегов
- Rate Limiting — 10 запросов/мин на IP для POST-эндпоинтов
- Клиентская (Zod) и серверная (FluentValidation) валидация

### Файлы
- Загрузка изображений (JPG, GIF, PNG) — автоматическое уменьшение до 320x240 через SkiaSharp
- Загрузка текстовых файлов (TXT, макс. 100KB)
- Drag & drop загрузка
- Lightbox превью с анимациями

### HTML-тулбар
- Кнопки вставки тегов `[i]`, `[strong]`, `[code]`, `[a]` вокруг выделенного текста
- AJAX-превью комментария без перезагрузки страницы

### Real-time
- SignalR WebSocket — новые комментарии появляются у всех пользователей без перезагрузки
- Redis backplane для горизонтального масштабирования

### Поиск
- Полнотекстовый поиск через Elasticsearch
- Поиск по UserName, Email и тексту комментария

### GraphQL
- Queries: получение списка комментариев, комментарий по ID, поиск
- Mutations: создание комментария
- Subscriptions: подписка на новые комментарии

## Запуск

### Docker Compose (рекомендуется)

```bash
git clone https://github.com/olegkatrichuk/Comments-SPA-backend.git
cd Comments-SPA-backend
cp .env.example .env
# отредактируйте пароли в .env
docker compose up --build
```

Сервисы:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5001
- **Swagger UI**: http://localhost:5001/swagger (только в Development)
- **GraphQL Playground**: http://localhost:5001/graphql
- **RabbitMQ Management**: http://localhost:15672

### Локальная разработка

Требования: .NET 9 SDK, Node.js 20+, PostgreSQL, Redis, RabbitMQ, Elasticsearch.

**Backend:**
```bash
dotnet restore
dotnet build
cd src/Comments.API
dotnet run
```

**Frontend:**
```bash
cd src/Comments.WebApp
npm install
npm run dev
```

## API Endpoints

### REST

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/comments` | Список комментариев (пагинация + сортировка) |
| GET | `/api/comments/{id}` | Комментарий по ID с вложенными ответами |
| POST | `/api/comments` | Создание комментария (multipart/form-data) |
| GET | `/api/captcha` | Генерация CAPTCHA (image + key) |
| GET | `/api/files/{id}` | Получение вложенного файла |
| GET | `/api/search` | Полнотекстовый поиск комментариев |

### GraphQL

Endpoint: `/graphql`

```graphql
# Запрос комментариев
query {
  comments(page: 1, pageSize: 25, sortField: CREATED_AT, sortDirection: DESCENDING) {
    items { id userName email text createdAt replies { id text } }
    totalCount page pageSize hasNextPage
  }
}

# Подписка на новые комментарии
subscription {
  onCommentCreated { id userName text createdAt }
}
```

### SignalR Hub

Endpoint: `/hubs/comments`

События:
- `CommentCreated` — новый комментарий создан

## Схема базы данных

### Таблица `comments`

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID (v7) | Первичный ключ (time-sortable) |
| user_name | VARCHAR(50) | Имя пользователя (буквы + цифры) |
| email | VARCHAR(254) | Email |
| home_page | VARCHAR(2048) | URL домашней страницы (nullable) |
| text | TEXT | Текст комментария (макс. 8000) |
| created_at | TIMESTAMPTZ | Дата создания |
| parent_comment_id | UUID | FK на родительский комментарий (nullable) |

Индексы: created_at DESC, user_name, email, parent_comment_id, partial index на top-level комментарии.

### Таблица `attachments`

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | Первичный ключ |
| file_name | VARCHAR(255) | Оригинальное имя файла |
| stored_file_name | VARCHAR(255) | Имя файла в хранилище |
| content_type | VARCHAR(100) | MIME-тип |
| file_size_bytes | BIGINT | Размер файла |
| type | INTEGER | 0 = Image, 1 = TextFile |
| comment_id | UUID | FK на комментарий (CASCADE) |

## Архитектурные решения для высокой нагрузки

- **UUIDv7** — time-sortable первичные ключи, отсутствие contention на sequence
- **Partial index** — фильтрованный индекс на top-level комментарии (`WHERE parent_comment_id IS NULL`)
- **Redis cache-aside** — кэширование пагинированных запросов (TTL 5 мин), инвалидация при записи
- **Async processing** — индексация в Elasticsearch и SignalR broadcast через RabbitMQ consumer (вне request path)
- **AsSplitQuery()** — предотвращение cartesian explosion при загрузке вложенных комментариев
- **Rate Limiting** — Fixed Window: 10 комментариев/мин на IP
- **Redis backplane** — горизонтальное масштабирование SignalR

## Нагрузочное тестирование

NBomber сценарии (3 минуты каждый):
- `read_comments` — 100 запросов/сек, чтение с пагинацией
- `create_comments` — 50 запросов/сек, создание комментариев
- `search_comments` — 80 запросов/сек, полнотекстовый поиск

```bash
cd tests/Comments.LoadTests
dotnet run -- http://localhost:5001
```

Отчет сохраняется в `reports/load_test_report.html`.
