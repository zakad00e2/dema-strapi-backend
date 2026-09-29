'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { normalizeSiteContent, planImport } = require('./normalize');

const snapshot = JSON.parse(readFileSync(join(__dirname, '../../data/site-content.json'), 'utf8'));

test('plans four Work and three Workshop creations for an empty target', () => {
  const plan = planImport({ workSlugs: [], workshopSlugs: [] }, normalizeSiteContent(snapshot));

  assert.equal(plan.creates.works.length, 4);
  assert.equal(plan.creates.workshops.length, 3);
  assert.deepEqual(plan.collisions, []);
});

test('reports an existing editor record without scheduling an overwrite', () => {
  const plan = planImport(
    { workSlugs: ['the-obsidian-gala'], workshopSlugs: [] },
    normalizeSiteContent(snapshot),
  );

  assert.deepEqual(plan.creates.works.map((item) => item.slug), [
    'silk-and-silence',
    'the-alabaster-hearth',
    'dune-narrative',
  ]);
  assert.deepEqual(plan.collisions, [{ kind: 'work', slug: 'the-obsidian-gala' }]);
  assert.equal(plan.updates.length, 0);
});

test('plans groups that retain one input for each locale', () => {
  const normalized = normalizeSiteContent(snapshot);
  const plan = planImport({ workSlugs: [], workshopSlugs: [] }, normalized);
  const firstWork = plan.creates.works[0];

  assert.deepEqual(firstWork.locales.map((entry) => entry.locale).sort(), ['ar', 'en']);
});
