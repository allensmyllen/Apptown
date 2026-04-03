const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Execute a parameterised SQL query.
 * @param {string} text  - SQL string with $1, $2 … placeholders
 * @param {Array}  params - parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { query, pool };
