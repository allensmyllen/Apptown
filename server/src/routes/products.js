const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');

const router = express.Router();

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const VALID_FORMATS = ['zip', 'rar', 'tar.gz'];

/**
 * Determine file format from original filename.
 * Returns the format string or null if unsupported.
 */
function getFileFormat(filename) {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar.gz')) return 'tar.gz';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.rar')) return 'rar';
  return null;
}

/**
 * Pure helper — used by property tests.
 * Filter an array of product objects by search string and/or category.
 */
function filterProducts(products, search, category) {
  return products.filter((p) => {
    if (!p.published) return false;
    if (category && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      const inTitle = p.title.toLowerCase().includes(q);
      const inDesc = p.description.toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }
    return true;
  });
}

// Multer — store in memory, enforce size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    if (err) return next(err);
    next();
  });
}

const productSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price_cents: z.coerce.number().int().positive(),
  category: z.enum(['theme', 'plugin', 'script', 'source_code']),
  preview_link: z.string().url().optional().nullable(),
});

// ── Public endpoints ──────────────────────────────────────────────────────────

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { search, category, page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page, 10) - 1) * limit;

    let query = 'SELECT * FROM products WHERE published = true';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await db.query(query, params);
    return res.json({ products: result.rows, page: parseInt(page, 10) });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM products WHERE id = $1 AND published = true',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── Admin endpoints ───────────────────────────────────────────────────────────

// POST /api/products
router.post('/', authenticate, requireAdmin, handleUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Product file is required' });
    }

    const format = getFileFormat(req.file.originalname);
    if (!format) {
      return res.status(415).json({ error: 'Unsupported file format' });
    }

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { title, description, price_cents, category, preview_link } = parsed.data;
    const fileKey = `products/${uuidv4()}-${req.file.originalname}`;

    await uploadFile(req.file.buffer, fileKey, req.file.mimetype);

    const result = await db.query(
      `INSERT INTO products (title, description, price_cents, category, preview_link, file_key, file_format)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, price_cents, category, preview_link || null, fileKey, format]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const fields = parsed.data;
    const keys = Object.keys(fields);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map((k) => fields[k]);
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE products SET ${setClauses}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id  (soft-delete)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE products SET published = false, updated_at = now() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.filterProducts = filterProducts;
module.exports.getFileFormat = getFileFormat;
