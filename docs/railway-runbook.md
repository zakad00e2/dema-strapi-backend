# Railway runbook — Dema Strapi

## Target architecture

- One **Strapi 5** service from this repository, on Node 22.
- One Railway PostgreSQL service, referenced by `DATABASE_URL`.
- One Railway Volume mounted at `/app/public/uploads`.
- One replica only. The local upload provider writes to the mounted volume.
- The public Vite site stays on its present host and is added to `FRONTEND_URL`.

## Deploy the backend

1. Create a Railway project and deploy this repository with `strapi-backend` as the root directory.
2. Add Railway PostgreSQL. In the Strapi service set `DATABASE_CLIENT=postgres` and reference the database connection as `DATABASE_URL`.
3. Add a Volume to the Strapi service at `/app/public/uploads`.
4. Set the service variables below. Generate every secret separately and keep their values in Railway only.
5. Use Node 22. Railway reads `railway.toml`, builds with `npm ci && npm run build`, starts with `npm start`, and checks `/_health`.
6. Generate a Railway public domain. The resulting address is the new Strapi origin and its admin is `<origin>/admin`.

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `HOST` | `0.0.0.0` |
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_URL` | Railway PostgreSQL reference |
| `DATABASE_SSL` | `false` for the Railway private network |
| `FRONTEND_URL` | Public site origin; comma-separate any preview origin |
| `APP_KEYS` | Four distinct random values, comma-separated |
| `ADMIN_JWT_SECRET` | Distinct random secret |
| `API_TOKEN_SALT` | Distinct random secret |
| `TRANSFER_TOKEN_SALT` | Distinct random secret |
| `ENCRYPTION_KEY` | Distinct random secret |
| `JWT_SECRET` | Distinct random secret |

Railway supplies `PORT`; do not set a fixed production port. Do not copy the stopped `strapiapp.com` URL or old Cloud credentials.

## Initial content load

1. Open the Railway `/admin` route and create the first administrator account.
2. In **Settings → Users & Permissions → Roles → Public**, enable `find` and `findOne` for Work and Workshop only.
3. Back up the empty Railway PostgreSQL database and Volume through Railway before importing.
4. From the deployed service shell, first run:

```bash
node scripts/site-content/import-site-content.js
```

5. Confirm the output reports 4 Works, 3 Workshops, and zero collisions. Then run the explicit write command:

```bash
node scripts/site-content/import-site-content.js --apply
```

6. Confirm Arabic and English variants are published, and that every image is served under `/uploads/`.
7. Back up PostgreSQL and the Volume again after the check succeeds.

The importer is intentionally create-only. It exits without writing by default, rejects the local default SQLite database, and rejects any existing source slug. Resolve a collision in the Railway admin before retrying; it never overwrites an editor record.

## Content reconstruction notes

The import source has 4 portfolio projects and 3 workshops from the checked-in site seed. It includes Arabic and English text plus 10 bundled image files. Two unavailable workshop image URLs are represented by approved temporary local substitutes, recorded in `data/media-manifest.json`.

## Cutover and rollback

Only update the Vite site API origin and `/admin` redirect after the Railway API returns the seven published records and media correctly. Keep the previous frontend deployment available. To roll back, restore its previous environment/origin configuration; do not delete the Railway database or volume.
