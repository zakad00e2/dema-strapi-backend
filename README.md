# Dema Strapi Backend

Headless CMS for the Dema website. Manages **Works** and **Workshops** content
and exposes a REST + GraphQL API the frontend consumes.

- Strapi 5 (TypeScript)
- SQLite for local dev, PostgreSQL for production
- Two collection types: `Work`, `Workshop`
- Two reusable components: `shared.seo`, `shared.cta`

---

## Quick start

```bash
cd strapi-backend
cp .env.example .env         # fill in secrets (see below)
npm install
npm run develop              # admin at http://localhost:1337/admin
```

On first run, open the admin URL and create the root admin user. The bootstrap
script automatically grants the **Public** role `find` + `findOne` access to
both collections, so the frontend can start reading the API immediately after
you publish your first entries.

The project is configured for bilingual content entry:

- English (`en`) is the default locale on first boot.
- Arabic (`ar`) is added automatically if it does not exist yet.
- `Work` and `Workshop` entries can store separate localized text per language.

### Generating the secrets in `.env`

Each of `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`,
`JWT_SECRET`, and `ENCRYPTION_KEY` should be a random string. Quick one-liner:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`APP_KEYS` expects 4 comma-separated values.

---

## Localization

Supported locales:

- `en` for English
- `ar` for Arabic

In the admin panel, create the English version first, then use the translation
action or locale switcher to add the Arabic version for the same document.
Shared fields such as `mainImage`, `gallery`, and `displayOrder`
are copied automatically from the existing locale when the new translation is created.

REST requests can target a specific language with `locale`:

```bash
GET /api/works?locale=en&populate=*
GET /api/works?locale=ar&populate=*
GET /api/workshops?locale=en&populate=*
GET /api/workshops?locale=ar&populate=*
```

If `locale` is omitted, Strapi returns the default locale.

---

## API endpoints

Once running, the frontend can call:

| Method | Endpoint                              | Purpose                       |
| ------ | ------------------------------------- | ----------------------------- |
| GET    | `/api/works`                          | List all published works      |
| GET    | `/api/works/:documentId`              | Single work by `documentId`   |
| GET    | `/api/workshops`                      | List all published workshops  |
| GET    | `/api/workshops/:documentId`          | Single workshop by `documentId` |

Useful query params:

- `?locale=en` or `?locale=ar` - fetch a specific language version

- `?populate=*` — include media + components
- `?populate[mainImage]=true&populate[seo]=true` — populate selectively
- `?sort=displayOrder:asc` — custom ordering
- `?pagination[page]=1&pagination[pageSize]=12`

Example frontend fetch:

```ts
const res = await fetch(
  `${process.env.STRAPI_URL}/api/works?locale=ar&populate=*&sort=displayOrder:asc`
);
const { data } = await res.json();
```

`works` entries also expose a repeatable `services` field for admin-managed service labels per project.

---

## Content model

### Work

| Field              | Type                | Notes                         |
| ------------------ | ------------------- | ----------------------------- |
| `title`            | string (required)   |                               |
| `slug`             | uid (from title)    |                               |
| `shortDescription` | text (280)          |                               |
| `fullDescription`  | richtext            |                               |
| `mainImage`        | media (required)    | images only                   |
| `gallery`          | media (multiple)    | images + videos               |
| `category`         | enumeration         | branding, web-design, ...     |
| `clientName`       | string              |                               |
| `projectDate`      | date                |                               |
| `location`         | string              |                               |
| `displayOrder`     | integer             |                               |
| `seo`              | component           | `shared.seo`                  |

### Workshop

| Field              | Type                | Notes                         |
| ------------------ | ------------------- | ----------------------------- |
| `title`            | string (required)   |                               |
| `slug`             | uid (from title)    |                               |
| `shortDescription` | text (280)          |                               |
| `fullDescription`  | richtext            |                               |
| `mainImage`        | media (required)    | images only                   |
| `gallery`          | media (multiple)    | optional                      |
| `workshopType`     | enumeration         | in-person, online, hybrid     |
| `targetAudience`   | string              |                               |
| `date`             | datetime            |                               |
| `duration`         | string              | e.g. "3 hours"                |
| `location`         | string              |                               |
| `price`            | decimal             |                               |
| `cta`              | component           | `shared.cta` (registration)   |
| `displayOrder`     | integer             |                               |
| `seo`              | component           | `shared.seo`                  |

---

## Deployment

The project runs on any Node 18–22 host. Checklist:

1. Set all `.env` secrets.
2. Set `DATABASE_CLIENT=postgres` and provide the connection vars.
3. Set `FRONTEND_URL` to your production frontend origin (comma-separate if several).
4. Run `npm run build` then `npm run start`.
5. For media at scale, install an S3 or Cloudinary upload provider and register it in `config/plugins.ts`.

### Railway

- New project → deploy from repo, root = `strapi-backend/`.
- Add the PostgreSQL plugin; Railway injects `DATABASE_URL` — map it to the
  `DATABASE_*` vars, or replace `config/database.ts` postgres block with
  `connectionString: env('DATABASE_URL')`.
- Build command: `npm run build` • Start command: `npm run start`.

### Strapi Cloud

- `npm run deploy` after logging in with `npx strapi login`.
- No manual DB config — Strapi Cloud manages Postgres + media.

### VPS (PM2)

```bash
npm ci --omit=dev
npm run build
pm2 start npm --name dema-cms -- run start
```

Put Nginx in front for TLS + gzip.

---

## Structure

```
strapi-backend/
├── config/              server, db, admin, middlewares, plugins, api
├── src/
│   ├── api/
│   │   ├── work/        schema + controller + route + service
│   │   └── workshop/
│   ├── components/shared/   seo.json, cta.json
│   └── index.ts         bootstrap: grants public read permissions
├── public/uploads/      local media (gitignored in prod)
├── database/migrations/
├── .env.example
└── package.json
```
