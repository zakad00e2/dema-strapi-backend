'use strict';

module.exports = () => ({
  upload: {
    config: {
      sizeLimit: 10 * 1024 * 1024, // 10 MB per file
      breakpoints: {
        xlarge: 1920,
        large: 1280,
        medium: 750,
        small: 500,
        xsmall: 64,
      },
    },
  },
});
