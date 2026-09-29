'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('pins a Node version supported by Strapi upload and sharp on Railway', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));

  assert.equal(packageJson.engines.node, '22.x');
});
