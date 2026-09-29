'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { groupBySlug, normalizeSiteContent } = require('./normalize');

const snapshot = JSON.parse(readFileSync(join(__dirname, '../../data/site-content.json'), 'utf8'));

test('normalizes every published entry into Arabic and English Strapi locale inputs', () => {
  const content = normalizeSiteContent(snapshot);

  assert.equal(content.works.length, 8);
  assert.equal(content.workshops.length, 6);

  const arabicWork = content.works.find((item) => item.slug === 'the-obsidian-gala' && item.locale === 'ar');
  const englishWork = content.works.find((item) => item.slug === 'the-obsidian-gala' && item.locale === 'en');
  assert.equal(arabicWork.data.title, 'بيسان خليلي – إطلاق الربيع');
  assert.equal(englishWork.data.title, 'Besan Khalaily – Spring Launch');
  assert.equal(arabicWork.data.heroTitle, 'حملة إطلاق متكاملة لمجموعة بيسان خليلي الربيعية.');
  assert.equal(englishWork.data.yearLabel, '2024');
  assert.equal(englishWork.data.featured, true);
  assert.equal(englishWork.data.preEventMarketingPoints.points.length, 6);
  assert.equal(englishWork.data.metrics.length, 3);
  assert.match(englishWork.assets.mainImage, /^media:\/\//);
  assert.equal(englishWork.assets.gallery.length, 3);

  const featuredWorkshop = content.workshops.find((item) => item.slug === 'content-that-converts' && item.locale === 'en');
  assert.equal(featuredWorkshop.data.fullDescription.startsWith('A private, fully customised'), true);
  assert.equal(featuredWorkshop.data.durationLabel, '3–4 hours');
  assert.equal(featuredWorkshop.data.levelLabel, 'All Levels');
  assert.equal(featuredWorkshop.data.ctaText, 'Enquire Now');
  assert.equal(featuredWorkshop.data.featured, true);
  assert.match(featuredWorkshop.assets.mainImage, /^media:\/\//);
});

test('groups localized records by their stable slug for Strapi document creation', () => {
  const content = normalizeSiteContent(snapshot);
  const groups = groupBySlug(content.works);

  assert.equal(groups.length, 4);
  const group = groups.find((entry) => entry.slug === 'the-obsidian-gala');
  assert.equal(group.locales.length, 2);
  assert.equal(group.locales.find((entry) => entry.locale === 'en').data.title, 'Besan Khalaily – Spring Launch');
});
