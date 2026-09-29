'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { assertSafeTarget, parseArgs } = require('./import-site-content');

test('dry-run is the default and --apply is explicit', () => {
  assert.deepEqual(parseArgs([]), { apply: false });
  assert.deepEqual(parseArgs(['--apply']), { apply: true });
});

test('refuses applying reconstructed content to the local default SQLite database', () => {
  assert.throws(
    () => assertSafeTarget({ apply: true, client: 'sqlite', filename: '.tmp/data.db', collisions: [] }),
    /local default SQLite database/
  );
});

test('refuses an apply when an editor record already uses a reconstructed slug', () => {
  assert.throws(
    () => assertSafeTarget({ apply: true, client: 'postgres', filename: '', collisions: [{ type: 'work', slug: 'bisaan-khalili' }] }),
    /existing records/
  );
});

test('allows an explicit apply only to an empty non-local target', () => {
  assert.doesNotThrow(() => assertSafeTarget({ apply: true, client: 'postgres', filename: '', collisions: [] }));
});
