# Railway Strapi Hosting and Neon Content Migration

Date: 2026-09-29

## Intent and scope

Host the existing Strapi 5 backend and its admin panel on Railway. Keep the public Vite site on its current host. Store CMS records in Neon PostgreSQL and uploaded media in a Railway Storage Bucket. The user chose Strapi's own admin panel for this deployment, so the site's existing browser-local `/admin` must lead to the Railway Strapi admin after cutover.

The authoritative migration input is the local website seed content in `deema1/src/admin/data/seedData.ts`: four published portfolio projects and three published workshops with Arabic and English copy. The user accepts that this source may omit content previously held only in the stopped Strapi Cloud project. Do not imply that deploying source code to Railway recovers the stopped Cloud database. The local Strapi SQLite database is archival evidence, not content to publish: it currently contains two test work documents represented by six locale/status rows, no workshops, and one media record. Preserve it and its local uploads without mixing test entries into the seven selected items.

Success means the seven selected items and all their fields are editable in Railway's Strapi admin, published content reads correctly in both languages on the public site, media links resolve, and the old browser-local admin no longer creates a second source of truth.

## Current system

- `strapi-backend` is Strapi 5.55.1 with `Work` and `Workshop` collection types, i18n, draft/publish, nested point/marketing components, SQLite in local development, and PostgreSQL support in `config/database.js`.
- `deema1` is a separate Vite/React site. Its API client, development proxy, and production rewrite contain the stopped Strapi Cloud hostname. Its `/admin` route uses `localStorage` for content and a client-side fixed password hash; those edits are not in Strapi or Neon.
- The site seed has four portfolio entries and three workshop entries, all marked published. Its model contains more detail than the current Strapi schemas, including case-study sections, display metadata, workshop formats and types, and featured status.
- The seed references seven local image paths that currently exist under `deema1/public` and six distinct external image URLs. Four external URLs responded successfully during design inspection; two Unsplash workshop cover URLs returned HTTP 404. The user approved temporary replacement images from available site assets for those two covers. Record their original URLs in the migration manifest.

## Proposed architecture

Railway runs one Strapi service from the `strapi-backend` repository, on Node 22, using its production build and start commands. The service connects over TLS to a dedicated Neon PostgreSQL database or isolated branch using server-side environment variables. Secrets stay in Railway variables and out of Git and client bundles. `FRONTEND_URL` allows the current public site's origin. Railway provides the public Strapi URL for the API and `/admin`.

Strapi's upload provider stores new and migrated media in a dedicated Railway Storage Bucket. The bucket must not be shared with a test import that may clear assets. Database metadata and object storage are treated as one content set for backup and verification. A test environment may use a separate bucket and Neon branch.

The public site stays on its current host. At cutover, update its hard-coded Strapi origin, development proxy, and production `/strapi` rewrite to the Railway service. The site's `/admin` route redirects to Railway's Strapi admin, replacing the local-only editing flow. Preserve the existing site release/configuration for rollback until the new API is verified.

## Content model and migration

Extend the Strapi schemas to represent every content field used by the seven seed entries, rather than dropping fields to fit today's narrower models. Keep editable bilingual text, repeatable ordered points, project sections, services, metrics, media galleries, slug, category/type, display order, featured state, and publication state. In particular, remove the current bootstrap behavior that forces every workshop to `openworkshop`; the selected workshops include `private`, `beginner`, and `advanced`. Keep the admin field layout grouped by purpose so editors can find basic details, Arabic/English copy, images, case-study or workshop details, and publishing controls.

Build a repeatable importer from the seed into Strapi's document API. Give each source item a stable import identity and preserve slug, order, featured state, and both locale versions. Imports must detect an already imported identity rather than create duplicates. Export/record a source manifest before writing: item identities, complete field values or hashes, media references, and the two unavailable original image URLs. Copy the seven available local-path assets and the four reachable external assets into the bucket. Use clearly identified local temporary images for the two unavailable workshop covers; keep their source URLs in the manifest for later replacement. Verify all imported media URLs and associations. Keep the original SQLite database and local upload files untouched and outside version control.

The current site's seed is also the public fallback when Strapi cannot be reached. During cutover, the new Strapi API becomes the primary content source. Public pages must map the expanded Strapi fields to the same visible content and handle API errors explicitly so a failed migration is not silently hidden by fallback data. The private workshop and two group workshops retain their current distinct presentation.

## Verification and release

1. Validate the source manifest: four portfolio items, three workshops, unique slugs, both locales, required media, and all source fields accounted for. Check local file hashes and external responses before import.
2. Build and start the backend against an isolated Neon target and bucket. Exercise admin login, public API, Arabic/English locale requests, draft/publish behavior, create/edit/reload, and media upload.
3. Import the seven selected documents. Compare normalized field values and ordered components against the source manifest, check four works and three workshops in each locale, verify publication state and public API payloads, and request each migrated asset URL. Record temporary cover substitutions as the only known media discrepancy.
4. Build and test the public site against Railway before changing its live API target. Verify the portfolio list, case studies, private workshop, group workshop cards, language switch, and `/admin` redirect.
5. Switch the site's API origin and rewrite only after checks pass. Keep the previous site release and migration archive available for rollback. A rollback restores the earlier site configuration while the Railway and Neon copy remains available for investigation.

## Failure handling and data protection

- No import may write to an existing Neon database or bucket without checking whether they contain data and taking a recoverable snapshot or export first. Test imports use isolated resources.
- Import failures stop cutover. They report the item, field, locale, or asset that failed, retain the manifest and source, and allow a safe retry without duplicates.
- A media reference that cannot be fetched is reported. The only approved substitutes are the two known workshop covers; additional failures need review before cutover.
- The stopped Strapi Cloud project is outside this migration's verified source. The Cloud content may be incomplete in the local seed, as the user explicitly accepted.
- No browser-stored admin password, database credentials, transfer tokens, or bucket credentials may enter the frontend bundle or Git.

## Non-goals

- Recovering data that exists only in the inaccessible Strapi Cloud project.
- Publishing the two local SQLite test documents.
- Building a separate custom CMS UI; the selected admin is Strapi's panel hosted by Railway.
- Moving the public site to Railway.
