# Railway Strapi Hosting and Site Content Rebuild

Date: 2026-09-29

## Outcome and source of truth

Run the existing Strapi 5 backend and its familiar built-in admin panel on Railway. Rebuild the four published portfolio projects and three workshops visible in the current site's checked-in content, including their Arabic and English text and available images. Connect the public site to the new Railway Strapi API while leaving the site's hosting where it is. The owner will use a new Railway `/admin` URL and create new administrator credentials.

This is a reconstruction from the site's content, **not** a transfer of the stopped Strapi Cloud database. The old `strapiapp.com` admin URL returns HTTP 404 and the Cloud project is scheduled for deletion. Cloud-only drafts, settings, media, and administrator passwords cannot be claimed as recovered. If an original Cloud export becomes available later, compare it with the reconstructed content before any import.

Do not use Neon. Do not move the public site's hosting or build a separate dashboard.

## Current system and constraints

- `strapi-backend` is Strapi 5.55.1. Its PostgreSQL configuration already accepts environment variables. Its Work and Workshop collections support Arabic and English locales, but their current fields do not cover all the site's editorial content.
- `deema1` is a separately hosted Vite/React site. Its API client, Vite proxy, and Vercel rewrite target the stopped Cloud URL. Its own `/admin` is browser-local and does not write to Strapi.
- The site's checked-in seed contains four published portfolio items and three workshops. Its local images are available. Two remote workshop image URLs fail and will receive clearly documented temporary replacements from available site assets, as the owner approved.
- The local Strapi SQLite database contains one administrator, two distinct Work documents, and no Workshops. It is incomplete and is not the import source. Preserve it and its local upload directory unchanged.
- The `deema1` checkout currently has a broken Git worktree pointer. Restore a valid checkout before modifying the frontend; keep existing files and any uncommitted work intact.

## Railway deployment

Deploy `strapi-backend` from its repository as one Railway service on Node 22 using its production build and start scripts. Railway assigns the public domain and application port. Generate distinct production values for Strapi application keys, admin/JWT, API/transfer token, and encryption secrets, and store them only in Railway service variables.

Add a new Railway PostgreSQL service and configure the existing `DATABASE_*` variables through Railway references. Attach a dedicated Railway Volume at `/app/public/uploads` for the existing local upload provider so image URLs remain ordinary public Strapi `/uploads` URLs across deploys. Run a single Strapi replica with this volume. Keep the local SQLite database and uploads untouched.

Use a new administrator account on the Railway instance. The owner chooses its email and password in the Strapi setup flow. Recreate any additional administrator accounts and roles only from verified owner-supplied identities. No old password or existing session is assumed to transfer; Strapi's data transfer tool excludes admin users and API tokens.

## Content model and reconstruction

Extend the Work and Workshop schemas only where needed to represent the site's current editable content. Keep Strapi's built-in content manager as the editing interface, with clear field labels and grouped content sections. Preserve localized titles, summaries, project story sections, services, workshop details, display order, publish state, and media relations. Keep purely visual layout classes in the frontend, keyed by stable slug to preserve the current page layout, unless a specific display choice must be editable to preserve the published page.

Build a repeatable, non-destructive import from the checked-in site seed into the new Railway database. Match records by stable slug and locale; create or update only the seven intended items and their media, and do not erase unrelated records. Import Arabic and English variants, publish the currently published items, and keep a manifest of source URLs, uploaded files, and the two substitutions. Do not use the incomplete local Strapi database as content input.

Before import, inspect the target database and media library. If it is no longer empty or contains user edits, take a backup and compare records before applying updates. Keep a recoverable copy of the pre-import state. Upload media to the mounted volume and verify each referenced asset is reachable over HTTPS. The two temporary substitute images remain marked in the manifest for later replacement.

## Public site connection

After the Railway API contains and serves the reconstructed content, replace the stopped Cloud origin in the frontend API client, local development proxy, and production rewrite with the Railway origin. Preserve the site's existing hosting. Enable public read access only for the needed Work and Workshop endpoints, or use an appropriately scoped server-side mechanism if public access is unsuitable. Confirm both locales render the expected four projects and three workshops, with images and details intact.

The site's browser-local `/admin` is not the new source of truth. Redirect visitors who open the site's `/admin` to the Railway Strapi `/admin` once the new panel is ready, so edits happen in one place. Keep the old browser-local data and source files untouched for recovery until the switch is verified.

## Verification and cutover

1. Build and start the backend against an isolated PostgreSQL test database. Verify admin login, both content collections, and uploads on the proposed Railway configuration.
2. Inventory the seven source items and image references. Verify import mapping and ensure the generated Strapi API preserves the site's editorial fields in both locales.
3. Deploy Railway Strapi, PostgreSQL, and upload volume. Create the first administrator account. Capture the target state before import and back up the populated database and volume after import.
4. Import the four projects and three workshops. Verify counts, slugs, localized fields, publish status, media responses, and persistence after a redeploy.
5. Update the frontend API origin and `/admin` redirect only after the Railway data is verified. Check public pages in both languages and prove that changing and restoring one safe test field in Strapi changes the site after cache expiry. Verify rollback by retaining the previous site deployment and origin configuration.
6. Provide the owner with the new Railway admin URL, the media substitution list, backup locations, and a short runbook for future deploys and content edits.

## Limits and recovery

- Original Cloud content and admin credentials are recoverable only if Strapi Cloud or an original export becomes accessible. Rebuilding visible pages cannot recover unseen drafts or prove equality with the old Cloud database.
- Existing Strapi Cloud URLs under `strapiapp.com` are provider-owned and will not become Railway URLs. The Railway admin uses a new address.
- The two unavailable workshop images use temporary substitutes, explicitly tracked for replacement.
- Do not delete or overwrite the local SQLite database, local uploads, site seed, or old browser-local admin data. No destructive import flags should run against a database with unreviewed content.
