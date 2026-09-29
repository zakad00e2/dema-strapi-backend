'use strict';

const locales = ['ar', 'en'];

function localized(value, locale) {
  return value?.[locale] ?? '';
}

function bulletPoints(values) {
  return (values ?? []).filter(Boolean).map((text) => ({ text }));
}

function sectionTitle(locale, name) {
  const titles = {
    preEvent: { ar: 'التسويق قبل الفعالية', en: 'Pre-Event Marketing' },
    postEvent: { ar: 'التسويق بعد الفعالية', en: 'Post-Event Marketing' },
  };
  return titles[name][locale];
}

function categoryToClientType(category) {
  const normalized = String(category ?? '').toLowerCase();
  if (normalized === 'reimagined') return 'Reimagined';
  if (normalized === 'conceptual') return 'Conceptual';
  return 'Executed';
}

function normalizeWork(work, locale) {
  return {
    slug: work.slug,
    locale,
    publish: work.status === 'published',
    data: {
      title: localized(work.title, locale),
      slug: work.slug,
      shortDescription: localized(work.shortDescription, locale),
      heroTitle: localized(work.heroTitle, locale),
      heroIntro: localized(work.heroIntro, locale),
      campaignOverview: localized(work.campaignOverview, locale),
      clientName: localized(work.client, locale),
      clientType: categoryToClientType(work.category),
      location: localized(work.location, locale),
      yearLabel: work.year ?? '',
      services: bulletPoints(localized(work.services, locale)),
      preEventMarketingPoints: {
        title: sectionTitle(locale, 'preEvent'),
        points: bulletPoints(localized(work.preEventMarketing, locale)),
      },
      postEventMarketingPoints: {
        title: sectionTitle(locale, 'postEvent'),
        points: bulletPoints(localized(work.postEventMarketing, locale)),
      },
      launchEventExperiencePoints: bulletPoints(localized(work.launchEventExperience, locale)),
      campaignImpactPoints: bulletPoints(localized(work.campaignImpact, locale)),
      metrics: (work.metrics ?? []).map((metric) => ({
        label: localized(metric.label, locale),
        value: metric.value,
      })),
      featured: Boolean(work.featured),
      displayOrder: work.sortOrder ?? 0,
    },
    assets: {
      mainImage: work.coverImage ?? '',
      desktopImage: work.desktopImage ?? '',
      gallery: work.gallery ?? [],
      preEventMarketingImages: work.preEventImages ?? [],
      postEventMarketingImages: work.postEventImages ?? [],
    },
  };
}

function normalizeWorkshop(workshop, locale) {
  return {
    slug: workshop.slug,
    locale,
    publish: workshop.status === 'published',
    data: {
      title: localized(workshop.title, locale),
      slug: workshop.slug,
      workshopType: workshop.workshopType,
      shortDescription: localized(workshop.shortSummary, locale),
      fullDescription: localized(workshop.fullDescription, locale),
      whatYouWillLearnPoints: bulletPoints(localized(workshop.whatYoullLearn, locale)),
      durationLabel: localized(workshop.duration, locale),
      formatDetails: localized(workshop.format, locale),
      datesLabel: localized(workshop.dates, locale),
      levelLabel: localized(workshop.level, locale),
      ctaText: localized(workshop.ctaText, locale),
      ctaLink: workshop.ctaLink ?? '',
      featured: Boolean(workshop.featured),
      displayOrder: workshop.sortOrder ?? 0,
    },
    assets: {
      mainImage: workshop.coverImage ?? '',
    },
  };
}

function normalizeSiteContent(snapshot) {
  if (snapshot?.version !== 1) throw new Error('Unsupported site content snapshot.');
  const works = (snapshot.works ?? []).flatMap((work) => locales.map((locale) => normalizeWork(work, locale)));
  const workshops = (snapshot.workshops ?? []).flatMap((workshop) =>
    locales.map((locale) => normalizeWorkshop(workshop, locale)),
  );
  return { works, workshops };
}

function groupBySlug(items) {
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item.slug) ?? { slug: item.slug, locales: [] };
    group.locales.push(item);
    groups.set(item.slug, group);
  }
  return [...groups.values()];
}

function planImport(existing, normalized, { allowUpdates = false } = {}) {
  const creates = { works: [], workshops: [] };
  const collisions = [];
  const updates = [];
  const sources = [
    ['work', groupBySlug(normalized.works), new Set(existing.workSlugs ?? []), creates.works],
    ['workshop', groupBySlug(normalized.workshops), new Set(existing.workshopSlugs ?? []), creates.workshops],
  ];

  for (const [kind, groups, existingSlugs, target] of sources) {
    for (const group of groups) {
      if (existingSlugs.has(group.slug)) {
        collisions.push({ kind, slug: group.slug });
        if (allowUpdates) updates.push({ kind, slug: group.slug });
      } else {
        target.push(group);
      }
    }
  }

  return { creates, collisions, updates };
}

module.exports = { groupBySlug, normalizeSiteContent, planImport };
