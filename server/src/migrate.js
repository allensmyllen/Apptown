/**
 * Runs all pending migrations in order.
 * Safe to run multiple times — skips already-applied migrations.
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function migrate() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Get already-applied migrations
    const applied = await client.query('SELECT filename FROM _migrations');
    const appliedSet = new Set(applied.rows.map(r => r.filename));

    // Read and sort migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] Applying ${file}…`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        // 42P07 = duplicate_table, 42701 = duplicate_column, 42P06 = duplicate_schema
        // These mean the migration was already applied manually — mark it done and continue
        const alreadyExists = ['42P07', '42701', '42P06', '23505'].includes(err.code);
        if (alreadyExists) {
          console.log(`[migrate] ~ ${file} (already applied, marking done)`);
          await client.query(
            'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
            [file]
          );
        } else {
          console.error(`[migrate] ✗ ${file}: ${err.message}`);
          throw err;
        }
      }
    }

    console.log('[migrate] All migrations applied.');
  } finally {
    client.release();
  }
}

module.exports = { migrate };
