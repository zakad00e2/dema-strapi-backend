'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const readSchema = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

test('Work schema accepts the reconstructed case-study fields', () => {
  const schema = readSchema('src/api/work/content-types/work/schema.json');

  for (const field of ['heroTitle', 'heroIntro', 'campaignOverview', 'yearLabel', 'desktopImage', 'metrics', 'featured']) {
    assert.ok(schema.attributes[field], `${field} is available to editors`);
  }

  assert.equal(schema.attributes.metrics.component, 'shared.metric');
  assert.equal(schema.attributes.metrics.repeatable, true);
  assert.equal(schema.attributes.desktopImage.type, 'media');
  assert.equal(schema.attributes.featured.type, 'boolean');
});

test('Workshop schema keeps source workshop types and editor-facing detail fields', () => {
  const schema = readSchema('src/api/workshop/content-types/workshop/schema.json');

  for (const field of ['fullDescription', 'durationLabel', 'datesLabel', 'levelLabel', 'ctaText', 'ctaLink', 'featured']) {
    assert.ok(schema.attributes[field], `${field} is available to editors`);
  }

  assert.ok(schema.attributes.workshopType.enum.includes('group'));
  assert.ok(schema.attributes.workshopType.enum.includes('private'));
  assert.ok(schema.attributes.workshopType.enum.includes('openworkshop'));
});

test('Workshop lifecycle leaves the editor-selected workshop type intact', () => {
  const lifecyclePath = path.join(root, 'src/api/workshop/content-types/workshop/lifecycles.js');
  const lifecycle = fs.readFileSync(lifecyclePath, 'utf8');

  assert.doesNotMatch(lifecycle, /workshopType\s*=\s*WORKSHOP_TYPE/);
});
