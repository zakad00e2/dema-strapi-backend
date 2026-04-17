'use strict';

const PUBLIC_READ_ACTIONS = ['find', 'findOne'];
const PUBLIC_READ_CONTENT_TYPES = ['api::work.work', 'api::workshop.workshop'];

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
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
