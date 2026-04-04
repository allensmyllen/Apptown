const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');

const router = express.Router();

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MIME_TO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function getFileFormat(filename) {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar.gz')) return 'tar.gz';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.rar')) return 'rar';
  return null;
}

function filterProducts(products, search, category) {
  return products.filter((p) => {
    if (!p.published) return false;
    if (category && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function validateImage(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) return 'Unsupported image format (jpg, png, webp only)';
  if (file.size > MAX_IMAGE_SIZE) return 'Image too large (max 5MB)';
  return null;
}

function buildImageUrl(imageKey) {
  const hasS3 = process.env.S3_ACCESS_KEY_ID && process.env.S3_ACCESS_KEY_ID !== 'your_access_key_id';
  if (hasS3) {
    return 'https://' + process.env.S3_BUCKET + '.s3.' + process.env.S3_REGION + '.amazonaws.com/' + imageKey;
  }
  return '/uploads/' + imageKey.replace(/\//g, '_');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
}).fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]);

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
  category: z.string().min(1),
  preview_link: z.string().url().optional().nullable(),
});

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { search, category, page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page, 10) - 1) * limit;

    let conditions = ['p.published = true'];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push('p.category = $' + params.length);
    }
    if (search) {
      params.push('%' + search + '%');
      conditions.push('(p.title ILIKE $' + params.length + ' OR p.description ILIKE $' + params.length + ')');
    }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT p.*,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') AS sales_count,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM products p
      LEFT JOIN orders o ON o.product_id = p.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE ${where}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await db.query(sql, params);
    return res.json({ products: result.rows, page: parseInt(page, 10) });
  } catch (err) {
    next(err);
  }
});

    if (category) {
      params.push(category);
      sql += ' AND category = $' + params.length;
    }
    if (search) {
      params.push('%' + search + '%');
      sql += ' AND (title ILIKE $' + params.length + ' OR description ILIKE $' + params.length + ')';
    }
    sql += ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;

    const result = await db.query(sql, params);
    return res.json({ products: result.rows, page: parseInt(page, 10) });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') AS sales_count,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
       FROM products p
       LEFT JOIN orders o ON o.product_id = p.id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE p.id = $1 AND p.published = true
       GROUP BY p.id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/products (admin)
router.post('/', authenticate, requireAdmin, handleUpload, async (req, res, next) => {
  try {
    const productFile = req.files && req.files.file && req.files.file[0];
    if (!productFile) return res.status(400).json({ error: 'Product file is required' });

    const format = getFileFormat(productFile.originalname);
    if (!format) return res.status(415).json({ error: 'Unsupported file format' });

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { title, description, price_cents, category, preview_link } = parsed.data;
    const fileKey = 'products/' + uuidv4() + '-' + productFile.originalname;
    await uploadFile(productFile.buffer, fileKey, productFile.mimetype);

    let imageUrl = null;
    const imageFile = req.files && req.files.image && req.files.image[0];
    if (imageFile) {
      const imgErr = validateImage(imageFile);
      if (imgErr) return res.status(imageFile.size > MAX_IMAGE_SIZE ? 413 : 415).json({ error: imgErr });
      const ext = MIME_TO_EXT[imageFile.mimetype];
      const imageKey = 'images/' + uuidv4() + '.' + ext;
      await uploadFile(imageFile.buffer, imageKey, imageFile.mimetype);
      imageUrl = buildImageUrl(imageKey);
    }

    const result = await db.query(
      'INSERT INTO products (title, description, price_cents, category, preview_link, file_key, file_format, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, description, price_cents, category, preview_link || null, fileKey, format, imageUrl]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', authenticate, requireAdmin, handleUpload, async (req, res, next) => {
  try {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const fields = { ...parsed.data };

    const imageFile = req.files && req.files.image && req.files.image[0];
    if (imageFile) {
      const imgErr = validateImage(imageFile);
      if (imgErr) return res.status(imageFile.size > MAX_IMAGE_SIZE ? 413 : 415).json({ error: imgErr });
      const ext = MIME_TO_EXT[imageFile.mimetype];
      const imageKey = 'images/' + uuidv4() + '.' + ext;
      await uploadFile(imageFile.buffer, imageKey, imageFile.mimetype);
      fields.image_url = buildImageUrl(imageKey);
    }

    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = keys.map((k, i) => k + ' = $' + (i + 1)).join(', ');
    const values = keys.map((k) => fields[k]);
    values.push(req.params.id);

    const result = await db.query(
      'UPDATE products SET ' + setClauses + ', updated_at = now() WHERE id = $' + values.length + ' RETURNING *',
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id (soft-delete, admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE products SET published = false, updated_at = now() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.filterProducts = filterProducts;
module.exports.getFileFormat = getFileFormat;
module.exports.validateImage = validateImage;
