const express = require('express');
const pool = require('../config/db');
const { auth, vendorOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/products — public, all products with vendor info
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = `
      SELECT p.*, u.name AS vendor_name
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND p.category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/products/mine — vendor sees only their products
router.get('/mine', auth, vendorOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get my products error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, u.name AS vendor_name FROM products p JOIN users u ON p.vendor_id = u.id WHERE p.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/products — vendor adds product
router.post('/', auth, vendorOnly, async (req, res) => {
  const { name, description, price, category, stock, image_url } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (vendor_id, name, description, price, category, stock, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, name, description, price, category, stock || 0, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/products/:id — vendor updates their product
router.put('/:id', auth, vendorOnly, async (req, res) => {
  const { name, description, price, category, stock, image_url } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1 AND vendor_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found or not yours.' });

    const result = await pool.query(
      'UPDATE products SET name=$1, description=$2, price=$3, category=$4, stock=$5, image_url=$6 WHERE id=$7 AND vendor_id=$8 RETURNING *',
      [name, description, price, category, stock, image_url, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/products/:id — vendor deletes their product
router.delete('/:id', auth, vendorOnly, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 AND vendor_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found or not yours.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
