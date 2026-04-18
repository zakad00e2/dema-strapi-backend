'use strict';

const PUBLIC_READ_ACTIONS = ['find', 'findOne'];
const PUBLIC_READ_CONTENT_TYPES = ['api::work.work', 'api::workshop.workshop'];
const MEDIA_NORMALIZED_CONTENT_TYPES = new Set(PUBLIC_READ_CONTENT_TYPES);
const REQUIRED_I18N_LOCALES = [
  { code: 'en', name: 'English (en)' },
  { code: 'ar', name: 'Arabic (ar)' },
];

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const isNumericString = (value) =>
  typeof value === 'string' && /^\d+$/.test(value);

const resolveUploadFileId = async (strapi, cache, documentId) => {
  if (!documentId) {
    return null;
  }

  if (cache.has(documentId)) {
    return cache.get(documentId);
  }

  const file = await strapi.db.query('plugin::upload.file').findOne({
    select: ['id'],
    where: { documentId },
  });

  const resolvedId = file?.id ?? null;
  cache.set(documentId, resolvedId);

  return resolvedId;
};

const normalizeMediaAssociation = async (strapi, cache, value) => {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => normalizeMediaAssociation(strapi, cache, entry)));
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    if (isNumericString(value)) {
      return Number(value);
    }

    return (await resolveUploadFileId(strapi, cache, value)) ?? value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if ('data' in value && value.data != null) {
    return normalizeMediaAssociation(strapi, cache, value.data);
  }

  // Prefer documentId when both are present so stale numeric ids don't break writes.
  if ('documentId' in value && value.documentId) {
    return normalizeMediaAssociation(strapi, cache, value.documentId);
  }

  if ('id' in value && value.id != null) {
    return isNumericString(value.id) ? Number(value.id) : value.id;
  }

  return value;
};

const normalizeMediaValue = async (strapi, cache, value) => {
  if (!isPlainObject(value)) {
    return normalizeMediaAssociation(strapi, cache, value);
  }

  const normalized = { ...value };
  let hasOperationPayload = false;

  for (const operation of ['set', 'connect', 'disconnect']) {
    if (!(operation in normalized) || normalized[operation] == null) {
      continue;
    }

    hasOperationPayload = true;
    normalized[operation] = Array.isArray(normalized[operation])
      ? await Promise.all(
          normalized[operation].map((entry) =>
            normalizeMediaAssociation(strapi, cache, entry)
          )
        )
      : await normalizeMediaAssociation(strapi, cache, normalized[operation]);
  }

  return hasOperationPayload
    ? normalized
    : normalizeMediaAssociation(strapi, cache, value);
};

const normalizeEntityMedia = async (strapi, uid, data, cache = new Map()) => {
  if (!isPlainObject(data)) {
    return data;
  }

  const schema = strapi.getModel(uid);

  if (!schema) {
    return data;
  }

  for (const [attributeName, attribute] of Object.entries(schema.attributes || {})) {
    const value = data[attributeName];

    if (value == null) {
      continue;
    }

    switch (attribute.type) {
      case 'media':
        data[attributeName] = await normalizeMediaValue(strapi, cache, value);
        break;
      case 'component':
        if (attribute.repeatable && Array.isArray(value)) {
          data[attributeName] = await Promise.all(
            value.map((entry) =>
              normalizeEntityMedia(strapi, attribute.component, entry, cache)
            )
          );
        } else {
          data[attributeName] = await normalizeEntityMedia(
            strapi,
            attribute.component,
            value,
            cache
          );
        }
        break;
      case 'dynamiczone':
        if (Array.isArray(value)) {
          data[attributeName] = await Promise.all(value.map(async (entry) => {
            if (isPlainObject(entry) && entry.__component) {
              return normalizeEntityMedia(strapi, entry.__component, entry, cache);
            }

            return entry;
          }));
        }
        break;
      default:
        break;
    }
  }

  return data;
};

const ensureI18nLocales = async (strapi) => {
  const i18n = strapi.plugin('i18n');

  if (!i18n) {
    return;
  }

  const localesService = i18n.service('locales');

  for (const locale of REQUIRED_I18N_LOCALES) {
    const existingLocale = await localesService.findByCode(locale.code);

    if (!existingLocale) {
      await localesService.create(locale);
    }
  }
};

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    await ensureI18nLocales(strapi);

    strapi.documents.use(async (ctx, next) => {
      if (!MEDIA_NORMALIZED_CONTENT_TYPES.has(ctx.uid)) {
        return next();
      }

      if (!['create', 'update'].includes(ctx.action) || !ctx.params?.data) {
        return next();
      }

      ctx.params.data = await normalizeEntityMedia(
        strapi,
        ctx.uid,
        { ...ctx.params.data }
      );

      return next();
    });

    const publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    if (!publicRole) return;

    for (const uid of PUBLIC_READ_CONTENT_TYPES) {
      for (const action of PUBLIC_READ_ACTIONS) {
        const actionId = `${uid}.${action}`;

        const existing = await strapi.db
          .query('plugin::users-permissions.permission')
          .findOne({ where: { action: actionId, role: publicRole.id } });

        if (!existing) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: { action: actionId, role: publicRole.id },
          });
        }
      }
    }
  },
};
