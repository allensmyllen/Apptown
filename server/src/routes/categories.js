const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Derive a URL-safe slug from a category name.
 * Trims, lowercases, replaces spaces with underscores, strips non-alphanumeric chars.
 * @param {string} name
 * @returns {string}
 */
function deriveSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// GET /api/categories — public, returns non-deleted categories ordered by name
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, slug, created_at FROM categories WHERE deleted_at IS NULL ORDER BY name ASC'
    );
    return res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — admin; validate name, derive slug, check duplicate, insert
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    const slug = deriveSlug(name);
    if (!slug) {
      return res.status(400).json({ error: 'name must contain at least one alphanumeric character' });
    }

    // Check for duplicate (case-insensitive) among non-deleted categories
    const dupCheck = await db.query(
      'SELECT id FROM categories WHERE lower(name) = lower($1) AND deleted_at IS NULL',
      [name.trim()]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const result = await db.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at',
      [name.trim(), slug]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    // Handle unique constraint violation on slug
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    next(err);
  }
});

// PUT /api/categories/:id — admin; update name + slug, check duplicate
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    const slug = deriveSlug(name);
    if (!slug) {
      return res.status(400).json({ error: 'name must contain at least one alphanumeric character' });
    }

    // Check for duplicate among other non-deleted categories
    const dupCheck = await db.query(
      'SELECT id FROM categories WHERE lower(name) = lower($1) AND deleted_at IS NULL AND id != $2',
      [name.trim(), req.params.id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const result = await db.query(
      'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 AND deleted_at IS NULL RETURNING id, name, slug, created_at',
      [name.trim(), slug, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    next(err);
  }
});

// DELETE /api/categories/:id — admin; check product usage, soft-delete or 409
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const catResult = await db.query(
      'SELECT id, slug FROM categories WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (catResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { slug } = catResult.rows[0];

    // Count published products using this category slug
    const usageResult = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category = $1 AND published = true',
      [slug]
    );
    const count = parseInt(usageResult.rows[0].count, 10);
    if (count > 0) {
      return res.status(409).json({ error: `Category is in use by ${count} product${count !== 1 ? 's' : ''}`, count });
    }

    await db.query(
      'UPDATE categories SET deleted_at = now() WHERE id = $1',
      [req.params.id]
    );
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.deriveSlug = deriveSlug;
