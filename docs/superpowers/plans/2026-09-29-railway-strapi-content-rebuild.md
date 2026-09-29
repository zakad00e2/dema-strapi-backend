# Railway Strapi Content Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the existing Strapi admin on Railway, rebuild the site's four projects and three workshops, and make the current public site read and reflect edits from the new Strapi instance.

**Architecture:** One Railway Strapi 5 service uses Railway PostgreSQL and a volume for uploads. A checked-in, deterministic snapshot of the site's bilingual seed and media drives a one-time guarded import. The Vite site remains on its current host and points to the new Strapi API; its `/admin` route sends editors to Railway.

**Tech Stack:** Strapi 5.55.1, Node 22, PostgreSQL, Railway Volume, Vite/React/TypeScript, Node test runner, `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-29-railway-strapi-hosting-design.md`

## Global Constraints

- Use Railway PostgreSQL; do not use Neon or the stopped Strapi Cloud database.
- Run one Strapi replica on Node 22 with a Railway Volume mounted at `/app/public/uploads`.
- Rebuild exactly four published Work documents and three published Workshop documents, each with `ar` and `en` locales, from `deema1/src/admin/data/seedData.ts`.
- Keep the public site on its current host. Retain the old local SQLite file, upload directory, checked-in site seed, and browser-local admin data.
- Two unavailable workshop images get documented temporary replacements from available site assets.
- The old `strapiapp.com/admin` address and old admin passwords are not transferred. The owner creates new admin credentials.
- Never run a destructive Strapi transfer/import against a database with unreviewed content.

## Review Focus

1. Re-running the seed import after an editor changes a record must report a collision and leave that edit intact; Task 2 tests the guarded update behavior.
2. A source image URL that returns 404 must resolve to its documented substitute, while all exported media resolve to readable files; Task 1 tests this.
3. A successful API response with zero published items must not silently show stale seed content; Task 4 tests empty responses.
4. Arabic and English API responses must preserve distinct localized text and the same stable slugs; Tasks 1, 2, and 4 test this.
5. Uploaded files must survive a Railway redeploy and remain fetchable over HTTPS; Task 3 verifies this.

## File structure

- Frontend `scripts/export-strapi-seed.ts`: snapshot the checked-in seed into a normalized JSON file and media bundle.
- Backend `data/site-content.json`, `data/site-media/`, `data/media-manifest.json`: immutable import input and image provenance.
- Backend `scripts/site-content/normalize.js`: pure mapping from snapshot items to Strapi document fields.
- Backend `scripts/import-site-content.js`: CLI guarded dry-run/apply using Strapi document and upload services.
- Backend Work/Workshop schemas and `src/components/shared/metric.json`: editable content fields.
- Frontend `src/api/works.ts`, `src/api/workshops.ts`: API-to-page adapters and caching.
- Frontend `src/App.tsx`, `src/WorkshopsPage.tsx`: Railway admin redirect and API-backed workshop display.
- Frontend `src/api/client.ts`, `vite.config.ts`, `vercel.json`: Railway API origin and proxy configuration.
- Backend `docs/railway-runbook.md`: deployment, backup, import, verification, and rollback commands.

---

### Task 1: Export the site's content and media

**Files:**
- Create: `deema1/scripts/export-strapi-seed.ts`
- Test: `deema1/scripts/export-strapi-seed.test.ts`
- Create: `strapi-backend/data/site-content.json`
- Create: `strapi-backend/data/media-manifest.json`
- Create: `strapi-backend/data/site-media/`

**Interfaces:**
- Consumes: `seedPortfolioItems` and `seedWorkshopItems` from `deema1/src/admin/data/seedData.ts`.
- Produces: `exportSiteSeed({ outputDir, mediaDir, fetchImage }: { outputDir: string; mediaDir: string; fetchImage: (url: string) => Promise<Uint8Array | null> }): Promise<{ works: number; workshops: number; media: number }>`; snapshot records keep `slug`, `ar`/`en` fields, publish status, sort order, and image references.

- [ ] **Step 1: Inspect Git and preserve the frontend checkout.** Run `git worktree list --porcelain` and `git worktree prune -n` in `deema1`. Only after confirming the stale entry points to the missing `C:/Users/zeka1/Desktop/projects/dema/deema1/.claude/worktrees/lucid-bartik-4832aa`, run `git worktree prune`; then require `git status --short` to succeed and account for any existing changes. Do not delete frontend files.
- [ ] **Step 2: Write failing exporter tests.** Assert four published works, three published workshops, both locales per slug, deterministic output without generated timestamps, and that a mocked 404 image gets a marked substitute with an existing local file.
- [ ] **Step 3: Run `node --import tsx --test scripts/export-strapi-seed.test.ts` in `deema1`.** Expected: fails because `exportSiteSeed` is absent.
- [ ] **Step 4: Implement `exportSiteSeed` and generate the snapshot.** Resolve local `public/` images; fetch reachable remote source images once; substitute only the two approved broken workshop URLs with available site images. Fail on any other missing image. Hash each bundled binary and record original URL/path, substitute reason, and output name in the manifest. Exclude volatile `createdAt` and `updatedAt`.
- [ ] **Step 5: Re-run the exporter tests and regenerate twice.** Expected: tests pass, both generated snapshots have identical hashes, and every manifest path exists. Commit exporter and generated data in their respective repos without moving or deleting source assets.

### Task 2: Make Strapi faithfully store and safely import the snapshot

**Files:**
- Modify: `strapi-backend/src/api/work/content-types/work/schema.json`
- Modify: `strapi-backend/src/api/workshop/content-types/workshop/schema.json`
- Create: `strapi-backend/src/components/shared/metric.json`
- Create: `strapi-backend/scripts/site-content/normalize.js`
- Create: `strapi-backend/scripts/site-content/normalize.test.js`
- Create: `strapi-backend/scripts/import-site-content.js`
- Create: `strapi-backend/scripts/site-content/import-policy.test.js`
- Modify: `strapi-backend/package.json`

**Interfaces:**
- Consumes: Task 1 snapshot and media manifest.
- Produces: `normalizeSiteContent(snapshot): { works: WorkLocaleInput[]; workshops: WorkshopLocaleInput[] }` and `planImport(existing, normalized, { allowUpdates: false }): ImportPlan`; CLI supports `--dry-run` (default) and `--apply` only after a reviewed target inventory.

- [ ] **Step 1: Write failing mapping and policy tests.** Assert four Work slugs × two locales and three Workshop slugs × two locales; preserve project hero/story sections, image arrays, services, metrics, workshop full description, date label, level, CTA, featured flag, order, and publication. Assert an existing edited slug is reported and never overwritten by default.
- [ ] **Step 2: Run `node --test scripts/site-content/normalize.test.js scripts/site-content/import-policy.test.js` in `strapi-backend`.** Expected: fails because normalization and policy functions do not exist.
- [ ] **Step 3: Extend schemas and implement pure mapping.** Work adds localized `heroTitle`, `heroIntro`, `campaignOverview`, `yearLabel`, `desktopImage`, `metrics`, and `featured`; reuse existing marketing groups, bullets, gallery, services, and main image. Workshop adds localized `fullDescription`, `durationLabel`, `datesLabel`, `levelLabel`, `ctaText`, plus `ctaLink` and `featured`; expand `workshopType` enum to `private`, `group`, `beginner`, `advanced`, `custom`. Keep `datesDetails` for compatibility but import the site's date text into `datesLabel`.
- [ ] **Step 4: Implement guarded import CLI.** Load Strapi inside the deployed service, inventory existing documents/media, output a dry-run report, import each unique media hash once via the upload service, create each bilingual document through Document Service, and publish intended items. `--apply` must refuse the default local `.tmp/data.db` and any target collision unless reviewed and explicitly scoped; never use `--force` or wipe unrelated records.
- [ ] **Step 5: Run unit tests, `npm run build`, and an isolated-database import rehearsal.** Use a disposable `.tmp/site-import-rehearsal.db` rather than `.tmp/data.db`. Expected: tests and build pass; first dry-run reports 4 + 3 creates; apply yields 4 + 3 published documents in each locale; second dry-run reports no creates and no overwrite. Commit schemas, importer, and tests.

### Task 3: Deploy and verify the Railway backend

**Files:**
- Modify: `strapi-backend/.env.example`
- Modify: `strapi-backend/README.md`
- Create: `strapi-backend/docs/railway-runbook.md`
- Modify only if needed after a failed rehearsal: `strapi-backend/config/database.js`, `config/server.js`, `config/middlewares.js`

**Interfaces:**
- Consumes: Task 2 backend and bundled data.
- Produces: Railway Strapi origin, working `/admin`, PostgreSQL content, public read-only Work/Workshop APIs, and persistent `/uploads`.

- [ ] **Step 1: Record exact Railway variables and deployment settings in the runbook.** Use Node 22, `npm ci`, `npm run build`, `npm start`, `HOST=0.0.0.0`, Railway `PORT`, `DATABASE_CLIENT=postgres`, PostgreSQL reference variables, and distinct Strapi secrets. Add `FRONTEND_URL` for the deployed site origin. Keep secret values out of Git and logs.
- [ ] **Step 2: Create the Railway service, PostgreSQL service, volume at `/app/public/uploads`, and a public domain.** If account authentication is missing, stop at the prepared dashboard/CLI login step and request the owner to authenticate; do not create resources in another account.
- [ ] **Step 3: Verify `GET /admin` and first administrator login over HTTPS.** The owner enters their own email/password; create any other admins only from verified identities.
- [ ] **Step 4: Capture target inventory, run the import dry-run, then apply after review.** If the target already has content, back it up and resolve the inventory before applying. Make separate `locale=ar` and `locale=en` requests to both `/api/works` and `/api/workshops`; expect 4 Works and 3 Workshops in each response. Enable only needed public find/findOne permissions.
- [ ] **Step 5: Verify all uploaded image URLs return 200, take PostgreSQL and volume backups, redeploy, and fetch the same URLs again.** Expected: admin login works, API counts and image hashes remain unchanged. Commit runbook/config changes.

### Task 4: Connect the existing site to Railway content

**Files:**
- Modify: `deema1/src/api/client.ts`
- Modify: `deema1/src/api/works.ts`
- Modify: `deema1/src/api/workshops.ts`
- Modify: `deema1/src/App.tsx`
- Modify: `deema1/src/WorkshopsPage.tsx`
- Modify: `deema1/vite.config.ts`
- Modify: `deema1/vercel.json`
- Test: `deema1/src/api/works.test.ts`
- Create: `deema1/src/api/workshops.test.ts`

**Interfaces:**
- Consumes: Task 3 Railway origin and Strapi JSON fields from Task 2.
- Produces: `fetchProjects(locale): Promise<Project[]>` with full editorial fields; `WorkshopPageItem` in `src/api/workshops.ts` carries slug, title, summary, description, image, level, format, dates, learns, CTA text/link, featured flag, and workshop type; `fetchWorkshops(locale): Promise<{ featured: WorkshopPageItem | null; groups: WorkshopPageItem[] }>`; and `useWorkshops(locale)` with the same data plus loading/error. The site's `/admin` redirects to the verified Railway origin plus `/admin`.

- [ ] **Step 1: Write failing adapter tests.** Feed representative `ar` and `en` API fixtures and assert all project story sections, images, metrics, year, and workshop summary/full description/CTA map without dropping content. Assert a 200 response with `data: []` stays empty rather than showing seed; an unavailable API can still use the existing fallback.
- [ ] **Step 2: Run `node --import tsx --test src/api/works.test.ts src/api/workshops.test.ts`.** Expected: new assertions fail.
- [ ] **Step 3: Implement API projection and page mapping.** Query the new Strapi fields and populated relations; retain visual layout choices keyed by existing slug. Make featured and group workshop content use the same API data in `App.tsx` and `WorkshopsPage.tsx`, replacing static featured text where it would mask edits.
- [ ] **Step 4: Switch origins after Task 3 passes.** Replace all three stopped Cloud origins in `src/api/client.ts`, `vite.config.ts`, and `vercel.json` with the verified Railway origin. Redirect the site's `/admin` route to Railway without erasing localStorage or old admin source. Make the redirect cover nested `/admin/*` paths.
- [ ] **Step 5: Re-run tests, `npm run lint`, and `npm run build` in `deema1`.** Expected: all pass; commit frontend changes.

### Task 5: Cutover, live edit check, and handoff

**Files:**
- Update: `strapi-backend/docs/railway-runbook.md` with actual nonsecret URLs, backup references, and rollback steps.

**Interfaces:**
- Consumes: Tasks 3 and 4 deployed outputs.
- Produces: verified live public site and a single working Railway Strapi admin entry point.

- [ ] **Step 1: Deploy the frontend to its existing host and keep the previous deployment available for rollback.** Verify its `/strapi` rewrite, direct API fallback, and media origin all point to Railway.
- [ ] **Step 2: Check the public site in Arabic and English.** Assert four projects, three workshops (one featured plus two group), expected titles/details, all image loads, and no requests to the stopped Cloud origin.
- [ ] **Step 3: Change one harmless text field in Railway Strapi, publish, wait through the five-minute API cache, and confirm the live site changes.** Restore the original field, publish, and verify the original text returns. Do not leave test content behind.
- [ ] **Step 4: Check `/admin` on the site and on the Railway origin.** Expected: both lead to the new Strapi login/admin, and the old provider URL is not presented as the admin link.
- [ ] **Step 5: Record final counts, both backup locations, media substitutions, Railway admin URL, and any unresolved Cloud-only data limitation in the runbook.** Report the same facts to the owner and stop optional testing once the cutover is verified.
