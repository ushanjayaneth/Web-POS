const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../database/firebase');
const { verifyFirebaseAdmin } = require('../middleware/firebaseAdminAuth');

const router = express.Router();

const MAX_IMAGE_CHARS = 1_500_000;
const MAX_IMAGES = 6;
const PAYMENT_METHODS = new Set(['cash', 'card', 'loan']);
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

router.use(verifyFirebaseAdmin);

const failValidation = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, errors: errors.array() });
  return true;
};

const cleanText = (value, maxLength) => (
  String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength)
);

const slugify = (value) => (
  cleanText(value, 140)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
);

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isSafeImage = (value) => {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_CHARS) return false;
  if (/^https:\/\/[^\s]+$/i.test(value)) return true;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i.test(value);
};

const publicProductFields = (product, id) => ({
  id,
  name: product.name,
  slug: product.slug,
  barcode: product.barcode || '',
  price: product.price,
  sale_price: product.sale_price ?? null,
  cost_price: product.cost_price ?? 0,
  stock: product.stock ?? 0,
  category_name: product.category_name || '',
  category_slug: product.category_slug || '',
  description: product.description || '',
  images: Array.isArray(product.images) ? product.images : [],
  is_active: product.is_active === false ? 0 : Number(product.is_active ?? 1),
  is_featured: product.is_featured === true ? 1 : Number(product.is_featured ?? 0),
  created_at: product.created_at || null,
  updated_at: product.updated_at || null,
});

const normalizeProductPayload = (body, existing = {}) => {
  const name = cleanText(body.name, 120);
  const categoryName = cleanText(body.category_name, 80);
  const price = Number(body.price);
  const salePrice = toNumberOrNull(body.sale_price);
  const costPrice = toNumberOrNull(body.cost_price) ?? 0;
  const stock = Math.max(0, Math.floor(Number(body.stock)));
  const images = Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, MAX_IMAGES) : [];
  const slug = slugify(body.slug || name);

  return {
    name,
    slug,
    barcode: cleanText(body.barcode, 64),
    price,
    sale_price: salePrice,
    cost_price: costPrice,
    stock,
    category_name: categoryName,
    category_slug: slugify(body.category_slug || categoryName),
    description: cleanText(body.description, 5000),
    images,
    is_active: body.is_active === false || Number(body.is_active) === 0 ? 0 : 1,
    is_featured: body.is_featured === true || Number(body.is_featured) === 1 ? 1 : 0,
    views: existing.views || 0,
    updated_at: Date.now(),
  };
};

const productValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('slug').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 120 }).matches(/^[a-z0-9-]+$/),
  body('barcode').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 64 }).matches(/^[a-zA-Z0-9._-]+$/),
  body('price').isFloat({ min: 0 }),
  body('sale_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  body('cost_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  body('stock').isInt({ min: 0, max: 1_000_000 }),
  body('category_name').trim().isLength({ min: 1, max: 80 }),
  body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('images').optional().isArray({ max: MAX_IMAGES }),
  body('images.*').optional().custom(isSafeImage).withMessage('Image must be HTTPS or a valid jpeg/png/webp data URL.'),
  body('is_active').optional().isIn([0, 1, true, false, '0', '1']),
  body('is_featured').optional().isIn([0, 1, true, false, '0', '1']),
];

router.get('/products', [
  query('include_inactive').optional().isBoolean(),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const includeInactive = req.query.include_inactive === 'true';
    const snapshot = await db.ref('products').once('value');
    const data = snapshot.val() || {};
    const products = Object.entries(data)
      .filter(([, product]) => !product.deleted_at)
      .filter(([, product]) => includeInactive || (product.is_active !== 0 && product.is_active !== false))
      .map(([id, product]) => publicProductFields(product, id))
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    res.json({ success: true, data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin products.' });
  }
});

router.post('/products', productValidators, async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const product = normalizeProductPayload(req.body);

    if (product.sale_price !== null && product.sale_price > product.price) {
      return res.status(400).json({ success: false, message: 'Sale price cannot be greater than regular price.' });
    }

    const productRef = db.ref('products').push();
    const productData = {
      ...product,
      created_at: Date.now(),
      created_by: req.admin.uid,
      updated_by: req.admin.uid,
    };

    await productRef.set(productData);
    res.status(201).json({ success: true, data: publicProductFields(productData, productRef.key) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

router.put('/products/:id', [
  param('id').trim().isLength({ min: 6, max: 160 }),
  ...productValidators,
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const productRef = db.ref(`products/${req.params.id}`);
    const snapshot = await productRef.once('value');
    const existing = snapshot.val();

    if (!existing || existing.deleted_at) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = normalizeProductPayload(req.body, existing);

    if (product.sale_price !== null && product.sale_price > product.price) {
      return res.status(400).json({ success: false, message: 'Sale price cannot be greater than regular price.' });
    }

    const updateData = {
      ...product,
      created_at: existing.created_at || Date.now(),
      created_by: existing.created_by || null,
      updated_by: req.admin.uid,
    };

    await productRef.update(updateData);
    res.json({ success: true, data: publicProductFields({ ...existing, ...updateData }, req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

router.delete('/products/:id', [
  param('id').trim().isLength({ min: 6, max: 160 }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const productRef = db.ref(`products/${req.params.id}`);
    const snapshot = await productRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await productRef.update({
      is_active: 0,
      deleted_at: Date.now(),
      deleted_by: req.admin.uid,
      updated_at: Date.now(),
    });

    res.json({ success: true, message: 'Product removed from catalog.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const snapshot = await db.ref('orders').once('value');
    const data = snapshot.val() || {};
    const orders = Object.entries(data)
      .map(([id, order]) => ({ id, ...order }))
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

router.put('/orders/:id/status', [
  param('id').trim().isLength({ min: 6, max: 160 }),
  body('status').isIn(ORDER_STATUSES),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const orderRef = db.ref(`orders/${req.params.id}`);
    const snapshot = await orderRef.once('value');
    const order = snapshot.val();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const newStatus = req.body.status;
    const updates = {
      [`orders/${req.params.id}/status`]: newStatus,
      [`orders/${req.params.id}/updated_at`]: Date.now(),
      [`orders/${req.params.id}/updated_by`]: req.admin.uid,
    };

    if (newStatus === 'confirmed' && order.status === 'pending') {
      for (const item of order.items || []) {
        const productSnapshot = await db.ref(`products/${item.product_id}`).once('value');
        const product = productSnapshot.val();

        if (!product) continue;

        const nextStock = Number(product.stock || 0) - Number(item.quantity || 0);
        if (nextStock < 0) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock to confirm ${product.name}.`,
          });
        }

        updates[`products/${item.product_id}/stock`] = nextStock;
        updates[`products/${item.product_id}/updated_at`] = Date.now();
      }
    }

    await db.ref().update(updates);
    res.json({ success: true, message: 'Order status updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

router.get('/sales', [
  query('payment_method').optional().isIn(['cash', 'card', 'loan']),
  query('status').optional().isLength({ min: 2, max: 32 }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const snapshot = await db.ref('sales').once('value');
    const data = snapshot.val() || {};
    let sales = Object.entries(data).map(([id, sale]) => ({ id, ...sale }));

    if (req.query.payment_method) {
      sales = sales.filter(sale => sale.payment_method === req.query.payment_method);
    }
    if (req.query.status) {
      sales = sales.filter(sale => sale.status === req.query.status);
    }

    sales.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    res.json({ success: true, data: sales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch sales.' });
  }
});

router.post('/sales', [
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.product_id').trim().isLength({ min: 6, max: 160 }),
  body('items.*.quantity').isInt({ min: 1, max: 10_000 }),
  body('discount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('payment_method').isIn([...PAYMENT_METHODS]),
  body('customer_name').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const { items, payment_method: paymentMethod } = req.body;
    const discount = Number(req.body.discount || 0);
    const saleItems = [];
    const productUpdates = {};
    let subtotal = 0;
    let totalCost = 0;

    for (const item of items) {
      const productSnapshot = await db.ref(`products/${item.product_id}`).once('value');
      const product = productSnapshot.val();
      const quantity = Number(item.quantity);

      if (!product || product.deleted_at || product.is_active === 0 || product.is_active === false) {
        return res.status(400).json({ success: false, message: `Product is not available: ${item.product_id}` });
      }

      if (Number(product.stock || 0) < quantity) {
        return res.status(400).json({ success: false, message: `Not enough stock for ${product.name}.` });
      }

      const price = Number(product.sale_price || product.price);
      const costPrice = Number(product.cost_price || 0);

      saleItems.push({
        product_id: item.product_id,
        name: product.name,
        price,
        cost_price: costPrice,
        quantity,
        total: price * quantity,
      });

      subtotal += price * quantity;
      totalCost += costPrice * quantity;
      productUpdates[`products/${item.product_id}/stock`] = Number(product.stock || 0) - quantity;
      productUpdates[`products/${item.product_id}/updated_at`] = Date.now();
    }

    if (discount > subtotal) {
      return res.status(400).json({ success: false, message: 'Discount cannot be greater than subtotal.' });
    }

    if (paymentMethod === 'loan' && !cleanText(req.body.customer_name, 120)) {
      return res.status(400).json({ success: false, message: 'Customer name is required for loan sales.' });
    }

    const total = subtotal - discount;
    const saleRef = db.ref('sales').push();
    const saleData = {
      id: saleRef.key,
      items: saleItems,
      subtotal,
      discount,
      total,
      total_cost: totalCost,
      profit: total - totalCost,
      payment_method: paymentMethod,
      status: paymentMethod === 'loan' ? 'unpaid' : 'paid',
      customer_name: paymentMethod === 'loan' ? cleanText(req.body.customer_name, 120) : null,
      created_by: req.admin.uid,
      created_at: Date.now(),
    };

    await db.ref().update({
      ...productUpdates,
      [`sales/${saleRef.key}`]: saleData,
    });

    res.status(201).json({ success: true, data: saleData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to complete sale.' });
  }
});

router.put('/sales/:id/settle', [
  param('id').trim().isLength({ min: 6, max: 160 }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const saleRef = db.ref(`sales/${req.params.id}`);
    const snapshot = await saleRef.once('value');
    const sale = snapshot.val();

    if (!sale || sale.payment_method !== 'loan') {
      return res.status(404).json({ success: false, message: 'Loan sale not found.' });
    }

    await saleRef.update({
      status: 'paid',
      settled_at: Date.now(),
      settled_by: req.admin.uid,
    });

    res.json({ success: true, message: 'Loan settled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to settle loan.' });
  }
});

module.exports = router;
