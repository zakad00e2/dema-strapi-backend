'use strict';

const WORKSHOP_TYPE = 'openworkshop';

const forceWorkshopType = (event) => {
  if (!event?.params) {
    return;
  }

  if (Array.isArray(event.params.data)) {
    event.params.data = event.params.data.map((entry) => ({
      ...entry,
      workshopType: WORKSHOP_TYPE,
    }));
    return;
  }

  if (event.params.data) {
    event.params.data.workshopType = WORKSHOP_TYPE;
  }
};

module.exports = {
  beforeCreate(event) {
    forceWorkshopType(event);
  },

  beforeCreateMany(event) {
    forceWorkshopType(event);
  },

  beforeUpdate(event) {
    forceWorkshopType(event);
  },

  beforeUpdateMany(event) {
    forceWorkshopType(event);
  },
};
