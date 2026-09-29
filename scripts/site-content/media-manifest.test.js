'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assetPathFor, mediaEntries, uploadFilePayload } = require('./import-site-content');

const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'media-manifest.json'), 'utf8'));

test('reads the checked-in manifest files and resolves every bundled asset', () => {
  const entries = mediaEntries(manifest);

  assert.equal(entries.length, 10);
  for (const entry of entries) {
    assert.ok(fs.existsSync(assetPathFor(entry)), `${entry.file} exists`);
  }
});

test('creates the Strapi 5 upload payload with a filepath', () => {
  const asset = mediaEntries(manifest)[0];
  const payload = uploadFilePayload(asset);

  assert.equal(payload.filepath, assetPathFor(asset));
  assert.equal(payload.originalFilename, path.basename(asset.file));
  assert.equal(payload.mimetype, 'image/jpeg');
});
