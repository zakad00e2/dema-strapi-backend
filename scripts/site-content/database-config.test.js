'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const databaseConfig = require('../../config/database');

function env(values) {
  const read = (key, fallback) => values[key] ?? fallback;
  read.int = (key, fallback) => Number(values[key] ?? fallback);
  read.bool = (key, fallback) => values[key] === undefined ? fallback : values[key] === 'true';
  return read;
}

test('uses Railway DATABASE_URL when supplied for PostgreSQL', () => {
  const config = databaseConfig({ env: env({
    DATABASE_CLIENT: 'postgres',
    DATABASE_URL: 'postgresql://railway:secret@postgres.railway.internal:5432/railway',
  }) });

  assert.equal(config.connection.client, 'postgres');
  assert.equal(config.connection.connection.connectionString, 'postgresql://railway:secret@postgres.railway.internal:5432/railway');
});

test('keeps local SQLite as the default development database', () => {
  const config = databaseConfig({ env: env({}) });

  assert.equal(config.connection.client, 'sqlite');
  assert.match(config.connection.connection.filename, /\.tmp[\\/]data\.db$/);
});
