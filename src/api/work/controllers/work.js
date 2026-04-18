'use strict';

const { factories } = require('@strapi/strapi');

const DEFAULT_POPULATE = {
  mainImage: true,
  gallery: true,
  localizations: true,
  preEventMarketingPoints: {
    populate: {
      points: true,
      images: true,
    },
  },
  postEventMarketingPoints: {
    populate: {
      points: true,
      images: true,
    },
  },
  launchEventExperiencePoints: true,
  campaignImpactPoints: true,
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const mergePopulate = (currentPopulate, defaultPopulate) => {
  if (!currentPopulate || currentPopulate === '*') {
    return { ...defaultPopulate };
  }

  if (!isPlainObject(currentPopulate)) {
    return { ...defaultPopulate };
  }

  const merged = { ...currentPopulate };

  for (const [key, value] of Object.entries(defaultPopulate)) {
    if (!(key in merged)) {
      merged[key] = value;
      continue;
    }

    if (isPlainObject(merged[key]) && isPlainObject(value)) {
      merged[key] = mergePopulate(merged[key], value);
    }
  }

  return merged;
};

module.exports = factories.createCoreController('api::work.work', () => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: mergePopulate(ctx.query?.populate, DEFAULT_POPULATE),
    };

    return await super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: mergePopulate(ctx.query?.populate, DEFAULT_POPULATE),
    };

    return await super.findOne(ctx);
  },
}));
