const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const hasDatabase = Boolean(connectionString);
const pool = hasDatabase
  ? new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

function databaseUnavailable() {
  const error = new Error('Database is not configured. Set DATABASE_URL in Render.');
  error.code = 'DATABASE_NOT_CONFIGURED';
  return error;
}

module.exports = {
  hasDatabase,
  pool,
  query: (text, params) => hasDatabase ? pool.query(text, params) : Promise.reject(databaseUnavailable()),
};
