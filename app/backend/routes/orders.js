const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders — customer places an order
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can place orders.' });
  }

  const { items } = req.body; // items: [{ product_id, quantity }]

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const enrichedItems = [];

    for (const item of items) {
      const product = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (product.rows.length === 0) throw new Error(`Product ${item.product_id} not found.`);

      const p = product.rows[0];
      if (p.stock < item.quantity) throw new Error(`Insufficient stock for ${p.name}.`);

      total += p.price * item.quantity;
      enrichedItems.push({ ...item, price: p.price, name: p.name });

      // Reduce stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Create order
    const order = await client.query(
      'INSERT INTO orders (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, total, 'confirmed']
    );

    const orderId = order.rows[0].id;

    // Insert order items
    for (const item of enrichedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ order: order.rows[0], items: enrichedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order error:', err);
    res.status(400).json({ error: err.message || 'Order failed.' });
  } finally {
    client.release();
  }
});

// GET /api/orders — get orders for logged in user
router.get('/', auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'customer') {
      result = await pool.query(
        `SELECT o.*, json_agg(json_build_object('product_id', oi.product_id, 'name', p.name, 'quantity', oi.quantity, 'price', oi.price)) AS items
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.customer_id = $1
         GROUP BY o.id ORDER BY o.created_at DESC`,
        [req.user.id]
      );
    } else {
      // Vendors see orders that contain their products
      result = await pool.query(
        `SELECT o.*, json_agg(json_build_object('product_id', oi.product_id, 'name', p.name, 'quantity', oi.quantity, 'price', oi.price)) AS items
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.vendor_id = $1
         GROUP BY o.id ORDER BY o.created_at DESC`,
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
