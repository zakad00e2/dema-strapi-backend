'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeSiteContent, planImport } = require('./normalize');

const root = path.resolve(__dirname, '../..');
const contentPath = path.join(root, 'data', 'site-content.json');
const manifestPath = path.join(root, 'data', 'media-manifest.json');
const localDefaultDatabase = '.tmp/data.db';

function parseArgs(argv) {
  if (argv.length === 0) return { apply: false };
  if (argv.length === 1 && argv[0] === '--apply') return { apply: true };
  throw new Error('Usage: node scripts/site-content/import-site-content.js [--apply]');
}

function assertSafeTarget({ apply, client, filename, collisions }) {
  if (!apply) return;
  if (client === 'sqlite' && path.normalize(filename || '') === path.normalize(localDefaultDatabase)) {
    throw new Error('Refusing to apply reconstructed content to the local default SQLite database.');
  }
  if (collisions.length > 0) {
    throw new Error(`Refusing to apply because the target already contains ${collisions.length} existing records.`);
  }
}

function loadSnapshot() {
  return {
    content: JSON.parse(fs.readFileSync(contentPath, 'utf8')),
    manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
  };
}

function mediaEntries(manifest) {
  return manifest.files ?? manifest.media ?? [];
}

function assetPathFor(asset) {
  return path.join(root, 'data', asset.file);
}

function imageMimeType(asset) {
  if (asset.mimeType) return asset.mimeType;
  const extension = path.extname(asset.file).toLowerCase();
  return extension === '.png' ? 'image/png' : 'image/jpeg';
}

function uploadFilePayload(asset) {
  const filepath = assetPathFor(asset);
  return {
    filepath,
    originalFilename: path.basename(asset.file),
    mimetype: imageMimeType(asset),
    size: fs.statSync(filepath).size,
  };
}

async function existingSlugs(strapi, uid) {
  const documents = await strapi.documents(uid).findMany({ fields: ['slug'], locale: 'en', status: 'draft', limit: 1000 });
  return documents.map((document) => document.slug).filter(Boolean);
}

async function uploadAssets(strapi, manifest) {
  const upload = strapi.plugin('upload').service('upload');
  const files = new Map();

  for (const asset of mediaEntries(manifest)) {
    const filename = path.basename(asset.file);
    const existing = await strapi.db.query('plugin::upload.file').findOne({
      select: ['id'],
      where: { name: filename },
    });
    if (existing) {
      files.set(`media://${asset.id}`, existing.id);
      continue;
    }

    const file = await upload.upload({
      data: { fileInfo: { name: filename, alternativeText: 'Dema site reconstruction asset' } },
      files: uploadFilePayload(asset),
    });
    files.set(`media://${asset.id}`, file[0].id);
  }

  return files;
}

function resolveAsset(reference, files) {
  if (!reference) return undefined;
  const id = files.get(reference);
  if (!id) throw new Error(`Missing uploaded asset for ${reference}.`);
  return id;
}

function applyAssets(entry, files) {
  const data = structuredClone(entry.data);
  const assets = entry.assets;

  if (assets.mainImage) data.mainImage = resolveAsset(assets.mainImage, files);
  if (assets.desktopImage) data.desktopImage = resolveAsset(assets.desktopImage, files);
  if (assets.gallery?.length) data.gallery = assets.gallery.map((asset) => resolveAsset(asset, files));
  if (assets.preEventMarketingImages?.length) data.preEventMarketingPoints.images = assets.preEventMarketingImages.map((asset) => resolveAsset(asset, files));
  if (assets.postEventMarketingImages?.length) data.postEventMarketingPoints.images = assets.postEventMarketingImages.map((asset) => resolveAsset(asset, files));

  return data;
}

async function createLocalizedDocuments(strapi, uid, entries, files) {
  for (const group of entries) {
    const localizedEntries = group.locales;
    const english = localizedEntries.find((entry) => entry.locale === 'en');
    const arabic = localizedEntries.find((entry) => entry.locale === 'ar');
    const created = await strapi.documents(uid).create({
      data: applyAssets(english, files),
      locale: 'en',
      status: 'published',
    });

    await strapi.documents(uid).create({
      data: applyAssets(arabic, files),
      locale: 'ar',
      status: 'published',
      documentId: created.documentId,
    });
  }
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const { content, manifest } = loadSnapshot();
  const normalized = normalizeSiteContent(content);
  const { createStrapi } = require('@strapi/strapi');
  const strapi = await createStrapi().load();

  try {
    const existing = {
      workSlugs: await existingSlugs(strapi, 'api::work.work'),
      workshopSlugs: await existingSlugs(strapi, 'api::workshop.workshop'),
    };
    const plan = planImport(existing, normalized);
    assertSafeTarget({
      apply,
      client: strapi.db.config.connection.client,
      filename: strapi.db.config.connection.connection.filename,
      collisions: plan.collisions,
    });

    console.log(JSON.stringify({ apply, works: plan.creates.works.length, workshops: plan.creates.workshops.length, collisions: plan.collisions }, null, 2));
    if (!apply) return;

    const files = await uploadAssets(strapi, manifest);
    await createLocalizedDocuments(strapi, 'api::work.work', plan.creates.works, files);
    await createLocalizedDocuments(strapi, 'api::workshop.workshop', plan.creates.workshops, files);
    console.log('Imported reconstructed site content.');
  } finally {
    await strapi.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { assetPathFor, assertSafeTarget, mediaEntries, parseArgs, uploadFilePayload };
