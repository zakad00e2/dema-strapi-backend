# Railway Hosting for the Existing Strapi Backend

Date: 2026-09-29

## Intent and scope

Move hosting for the existing Strapi 5 backend and its built-in admin panel from the stopped Strapi Cloud project to Railway. This is a hosting-only change. The user explicitly does not want Neon, any content import, any media import, or a change to the public site's hosting or API connection in this work.

Success means a fresh instance of the existing backend runs on a Railway URL, its `/admin` loads and can authenticate, its empty Work and Workshop APIs respond, and new content and uploads persist across a redeployment. This deployment begins with no migrated content.

## Current system

- `strapi-backend` is Strapi 5.55.1. The existing `Work` and `Workshop` schemas, locale setup, and draft/publish behavior remain as they are.
- `config/database.js` already supports PostgreSQL through environment variables; local development defaults to SQLite.
- `deema1` is a separately hosted Vite site. Its API configuration still points to the stopped Strapi Cloud URL and currently uses local fallback content when requests fail. Its browser-local `/admin` is a separate UI. Both are outside this hosting-only change.
- The old Strapi Cloud URL returns HTTP 404 and its project is scheduled for deletion. Railway cannot recover that service's database or media merely by deploying the source code.
- The local SQLite file and upload directory contain test material. They remain untouched; neither is imported to Railway.

## Railway architecture

Deploy `strapi-backend` as one Railway service from its own repository. Pin the runtime to Node 22, run the existing production build and start scripts, expose the Railway-assigned port, and provide a public domain. Generate distinct production values for the Strapi application, admin, API token, transfer token, JWT, and encryption secrets. Store them only in Railway service variables.

Add a Railway PostgreSQL database for this new instance. Configure `DATABASE_CLIENT=postgres` and the existing `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and TLS-related variables through Railway references. Do not connect to Neon or to the old Cloud database. Add a dedicated Railway Storage Bucket and configure Strapi's S3-compatible upload provider so media uploaded after deployment is durable across service restarts and deployments. Keep the bucket credentials server-side.

The public site remains on its current host and continues to use its current configuration. Provide the Railway Strapi admin URL directly to the owner; do not redirect the site's `/admin` or change the site's Strapi API URLs during this work. The production CORS allowlist may include the existing site's origin so a later, separately approved connection can be made without changing the deployment architecture.

## Deployment and verification

1. Prepare the backend configuration and deployment files for Railway, with secret names documented and no secret values committed.
2. Build Strapi locally on the pinned Node version and check that its configuration starts against an isolated PostgreSQL database in a test environment.
3. Create the Railway Strapi service, Railway PostgreSQL database, and dedicated Storage Bucket. Configure variables and deploy the backend.
4. Verify the Railway health endpoint, `/admin` loading, initial admin login, and empty Work and Workshop API responses. Confirm Arabic and English locales are available.
5. Upload a disposable test image, confirm it can be requested from the bucket, redeploy the service, and confirm the image persists. Remove only the disposable test record and image after the check.
6. Record the Railway service URL and a concise runbook for redeployment, configuration, and later content or site migration.

## Data protection and limitations

- Keep `strapi-backend/.tmp/data.db` and `strapi-backend/public/uploads` intact. Do not import or delete their contents.
- Use a new Railway PostgreSQL database and bucket. Inspect them before any setup step that could overwrite existing resources.
- Back up the new PostgreSQL database and bucket before future content migrations. A later import is a separate task with its own source and verification.
- The new admin starts empty. Existing public site content stays on the current site as configured; editing the new Strapi admin will not change that site until a later connection is requested.
- Data stored only in the stopped Strapi Cloud project is not recovered by this hosting change and may be lost if that project is deleted.

## Non-goals

- Using Neon.
- Migrating existing content, media, or user accounts from any source.
- Modifying content schemas or building a custom dashboard.
- Moving or reconfiguring the public Vite site.
