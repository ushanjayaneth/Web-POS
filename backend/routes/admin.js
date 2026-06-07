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

// Lightweight product object for POS terminal (strips gallery images and sensitive fields).
const toPosProduct = (product, id) => ({
  id,
  name: product.name,
  slug: product.slug || '',
  barcode: product.barcode || '',
  price: product.price,
  sale_price: product.sale_price ?? null,
  stock: product.stock ?? 0,
  category_name: product.category_name || '',
  // Only send the first/cover image; gallery images are not needed on POS.
  images: Array.isArray(product.images) && product.images[0]
    ? [product.images[0]]
    : [],
  is_active: product.is_active === false ? 0 : Number(product.is_active ?? 1),
});

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
  query('pos_mode').optional().isBoolean(),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const includeInactive = req.query.include_inactive === 'true';
    const posMode = req.query.pos_mode === 'true';
    const snapshot = await db.ref('products').once('value');
    const data = snapshot.val() || {};
    const products = Object.entries(data)
      .filter(([, product]) => !product.deleted_at)
      .filter(([, product]) => includeInactive || (product.is_active !== 0 && product.is_active !== false))
      .map(([id, product]) => posMode ? toPosProduct(product, id) : publicProductFields(product, id))
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
  body('items.*.product_id').trim().isLength({ min: 3, max: 160 }),
  body('items.*.quantity').isInt({ min: -10000, max: 10_000 }),
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
      const quantity = Number(item.quantity);
      let name = '';
      let price = 0;
      let costPrice = 0;

      if (item.product_id.startsWith('CUSTOM_') || item.product_id === 'CREDIT' || item.product_id.startsWith('CREDIT_')) {
        name = item.name || (item.product_id === 'CREDIT' ? 'Credit Return' : 'Custom Item');
        price = Number(item.price || 0);
        costPrice = Number(item.cost_price || 0);
      } else {
        const productSnapshot = await db.ref(`products/${item.product_id}`).once('value');
        const product = productSnapshot.val();

        if (!product || product.deleted_at || product.is_active === 0 || product.is_active === false) {
          return res.status(400).json({ success: false, message: `Product is not available: ${item.product_id}` });
        }

        if (Number(product.stock || 0) < quantity) {
          return res.status(400).json({ success: false, message: `Not enough stock for ${product.name}.` });
        }

        name = product.name;
        price = Number(product.sale_price || product.price);
        costPrice = Number(product.cost_price || 0);

        productUpdates[`products/${item.product_id}/stock`] = Number(product.stock || 0) - quantity;
        productUpdates[`products/${item.product_id}/updated_at`] = Date.now();
      }

      saleItems.push({
        product_id: item.product_id,
        name,
        price,
        cost_price: costPrice,
        quantity,
        total: price * quantity,
      });

      subtotal += price * quantity;
      totalCost += costPrice * quantity;
    }

    if (subtotal > 0 && discount > subtotal) {
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

// POST /sales/:id/return
router.post('/sales/:id/return', [
  param('id').trim().isLength({ min: 6, max: 160 }),
  body('itemIdx').isInt({ min: 0 }),
  body('type').isIn(['exchange', 'refund']),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const saleId = req.params.id;
    const { itemIdx, type } = req.body;

    const saleRef = db.ref(`sales/${saleId}`);
    const snapshot = await saleRef.once('value');
    const sale = snapshot.val();

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    if (!sale.items || !sale.items[itemIdx]) {
      return res.status(400).json({ success: false, message: 'Item index not found in sale.' });
    }

    const item = sale.items[itemIdx];
    const amount = item.price || 0;

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Item is already returned or has 0 price.' });
    }

    // 1. Restore stock (if not custom or credit)
    const productUpdates = {};
    if (item.product_id && !item.product_id.startsWith('CUSTOM_') && item.product_id !== 'CREDIT') {
      const productSnapshot = await db.ref(`products/${item.product_id}`).once('value');
      const product = productSnapshot.val();
      if (product) {
        productUpdates[`products/${item.product_id}/stock`] = Number(product.stock || 0) + Number(item.quantity || 1);
        productUpdates[`products/${item.product_id}/updated_at`] = Date.now();
      }
    }

    // 2. Mark item as returned in this sale
    const updatedItems = [...sale.items];
    updatedItems[itemIdx] = {
      ...item,
      name: `[RETURNED] ${item.name}`,
      price: 0,
      total: 0
    };

    const nextStatus = updatedItems.every(it => it.price === 0) ? 'returned' : 'partial_return';

    // 3. Create negative refund transaction (new sale record with negative totals)
    const refundRef = db.ref('sales').push();
    const refundRecord = {
      id: refundRef.key,
      billId: 'RET-' + Date.now().toString().slice(-6),
      date: Date.now(),
      created_at: Date.now(),
      created_by: req.admin.uid,
      items: [{
        product_id: item.product_id,
        name: `Return: ${item.name}`,
        quantity: item.quantity,
        price: -Math.abs(amount),
        cost_price: item.cost_price || 0,
        total: -Math.abs(amount * item.quantity),
      }],
      subtotal: -Math.abs(amount * item.quantity),
      discount: 0,
      total: -Math.abs(amount * item.quantity),
      total_cost: -Math.abs((item.cost_price || 0) * item.quantity),
      profit: -Math.abs((amount * item.quantity) - ((item.cost_price || 0) * item.quantity)),
      payment_method: 'cash',
      status: 'paid',
      isReturn: true,
      parentSaleId: saleId,
    };

    // Prepare updates
    const updates = {
      ...productUpdates,
      [`sales/${saleId}/items`]: updatedItems,
      [`sales/${saleId}/status`]: nextStatus,
      [`sales/${saleId}/updated_at`]: Date.now(),
      [`sales/${saleId}/updated_by`]: req.admin.uid,
      [`sales/${refundRef.key}`]: refundRecord,
    };

    await db.ref().update(updates);

    res.json({
      success: true,
      message: 'Return processed successfully.',
      refundRecord,
      nextStatus
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process return.' });
  }
});

// GET /supplier-returns
router.get('/supplier-returns', async (req, res) => {
  try {
    const snapshot = await db.ref('supplier_returns').once('value');
    const data = snapshot.val() || {};
    const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
    list.sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch supplier returns.' });
  }
});

// POST /supplier-returns
router.post('/supplier-returns', [
  body('supplier_name').trim().isLength({ min: 2, max: 120 }),
  body('item_name').trim().isLength({ min: 2, max: 120 }),
  body('quantity').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0 }),
  body('reason').optional().trim(),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const newRef = db.ref('supplier_returns').push();
    const data = {
      supplier_name: req.body.supplier_name,
      item_name: req.body.item_name,
      quantity: Number(req.body.quantity),
      amount: Number(req.body.amount),
      reason: req.body.reason || '',
      created_at: Date.now(),
      created_by: req.admin.uid,
    };
    await newRef.set(data);
    res.status(201).json({ success: true, data: { id: newRef.key, ...data } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create supplier return.' });
  }
});

// DELETE /supplier-returns/:id
router.delete('/supplier-returns/:id', async (req, res) => {
  try {
    await db.ref(`supplier_returns/${req.params.id}`).remove();
    res.json({ success: true, message: 'Supplier return record removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete supplier return.' });
  }
});

// GET /loan-customers
router.get('/loan-customers', async (req, res) => {
  try {
    const snapshot = await db.ref('loan_customers').once('value');
    const data = snapshot.val() || {};
    const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loan customers.' });
  }
});

// POST /loan-customers
router.post('/loan-customers', [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('notes').optional().trim(),
  body('photo1').optional({ nullable: true }),
  body('photo2').optional({ nullable: true }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const newRef = db.ref('loan_customers').push();
    const data = {
      name: req.body.name,
      phone: req.body.phone || '',
      address: req.body.address || '',
      notes: req.body.notes || '',
      photo1: req.body.photo1 || null,
      photo2: req.body.photo2 || null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await newRef.set(data);
    res.status(201).json({ success: true, data: { id: newRef.key, ...data } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create loan customer.' });
  }
});

// PUT /loan-customers/:id
router.put('/loan-customers/:id', [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('notes').optional().trim(),
  body('photo1').optional({ nullable: true }),
  body('photo2').optional({ nullable: true }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const custRef = db.ref(`loan_customers/${req.params.id}`);
    const snapshot = await custRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const data = {
      name: req.body.name,
      phone: req.body.phone || '',
      address: req.body.address || '',
      notes: req.body.notes || '',
      photo1: req.body.photo1 !== undefined ? req.body.photo1 : null,
      photo2: req.body.photo2 !== undefined ? req.body.photo2 : null,
      updated_at: Date.now(),
    };
    await custRef.update(data);
    res.json({ success: true, data: { id: req.params.id, ...snapshot.val(), ...data } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
});

// DELETE /loan-customers/:id
router.delete('/loan-customers/:id', async (req, res) => {
  try {
    const loansSnapshot = await db.ref('loans').once('value');
    const loansData = loansSnapshot.val() || {};
    const updates = {};
    Object.entries(loansData).forEach(([loanId, loan]) => {
      if (loan.customerId === req.params.id) {
        updates[`loans/${loanId}`] = null;
      }
    });
    updates[`loan_customers/${req.params.id}`] = null;

    await db.ref().update(updates);
    res.json({ success: true, message: 'Customer and their loans deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
});

// GET /loans
router.get('/loans', async (req, res) => {
  try {
    const snapshot = await db.ref('loans').once('value');
    const data = snapshot.val() || {};
    const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans.' });
  }
});

// POST /loans
router.post('/loans', [
  body('customerId').trim().isLength({ min: 6, max: 120 }),
  body('description').trim().isLength({ min: 2, max: 200 }),
  body('items').optional({ nullable: true }).trim(),
  body('totalAmount').isFloat({ min: 0 }),
  body('paidAmount').isFloat({ min: 0 }),
  body('dueDate').optional({ nullable: true }).trim(),
  body('installments').optional().isArray(),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const newRef = db.ref('loans').push();
    const initPay = Number(req.body.paidAmount || 0);
    const data = {
      customerId: req.body.customerId,
      description: req.body.description,
      items: req.body.items || null,
      totalAmount: Number(req.body.totalAmount),
      paidAmount: initPay,
      dueDate: req.body.dueDate || null,
      installments: req.body.installments || [],
      paymentHistory: initPay > 0 ? [{ date: Date.now(), amount: initPay, note: 'Initial payment' }] : [],
      status: (Number(req.body.totalAmount) - initPay <= 0) ? 'cleared' : 'active',
      created_at: Date.now(),
      createdAt: new Date().toISOString(),
    };
    await newRef.set(data);
    res.status(201).json({ success: true, data: { id: newRef.key, ...data } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create loan.' });
  }
});

// PUT /loans/:id
router.put('/loans/:id', [
  body('status').optional().isIn(['active', 'cleared']),
  body('paidAmount').optional().isFloat({ min: 0 }),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const loanRef = db.ref(`loans/${req.params.id}`);
    const snapshot = await loanRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.paidAmount !== undefined) updates.paidAmount = Number(req.body.paidAmount);

    await loanRef.update(updates);
    res.json({ success: true, message: 'Loan updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update loan.' });
  }
});

// PUT /loans/:id/payment
router.put('/loans/:id/payment', [
  body('amount').isFloat({ min: 0.01 }),
  body('note').optional().trim(),
  body('date').optional().trim(),
], async (req, res) => {
  if (failValidation(req, res)) return;

  try {
    const loanRef = db.ref(`loans/${req.params.id}`);
    const snapshot = await loanRef.once('value');
    const loan = snapshot.val();
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const amt = Number(req.body.amount);
    const note = req.body.note || '';
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];
    const newPaid = Number(loan.paidAmount || 0) + amt;
    const history = [...(loan.paymentHistory || []), { date: new Date(dateStr).getTime(), amount: amt, note }];
    const cleared = newPaid >= Number(loan.totalAmount);

    await loanRef.update({
      paidAmount: newPaid,
      paymentHistory: history,
      status: cleared ? 'cleared' : 'active',
      updated_at: Date.now()
    });

    res.json({ success: true, message: 'Payment recorded.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

// PUT /loans/:id/installment/:idx
router.put('/loans/:id/installment/:idx', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx);
    const loanRef = db.ref(`loans/${req.params.id}`);
    const snapshot = await loanRef.once('value');
    const loan = snapshot.val();
    if (!loan || !loan.installments || !loan.installments[idx]) {
      return res.status(404).json({ success: false, message: 'Loan or installment not found.' });
    }

    const insts = [...loan.installments];
    const inst = insts[idx];
    if (inst.paid) {
      return res.status(400).json({ success: false, message: 'Installment is already paid.' });
    }

    insts[idx] = {
      ...inst,
      paid: true,
      paidDate: new Date().toISOString().split('T')[0]
    };

    const newPaid = Number(loan.paidAmount || 0) + Number(inst.amount);
    const history = [...(loan.paymentHistory || []), {
      date: Date.now(),
      amount: Number(inst.amount),
      note: `Installment ${idx + 1} paid`
    }];
    const cleared = newPaid >= Number(loan.totalAmount);

    await loanRef.update({
      installments: insts,
      paidAmount: newPaid,
      paymentHistory: history,
      status: cleared ? 'cleared' : 'active',
      updated_at: Date.now()
    });

    res.json({ success: true, message: `Installment ${idx + 1} marked paid.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update installment.' });
  }
});

// DELETE /loans/:id
router.delete('/loans/:id', async (req, res) => {
  try {
    await db.ref(`loans/${req.params.id}`).remove();
    res.json({ success: true, message: 'Loan deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete loan.' });
  }
});

// ═══════════════════════════════════════════════════════
// SELLER MANAGEMENT
// ═══════════════════════════════════════════════════════

const { sendSellerStatusEmail, sendOrderNotificationEmail } = require('../utils/mailer');

// GET /sellers — list all seller applications
router.get('/sellers', async (req, res) => {
  try {
    const snap = await db.ref('sellers').once('value');
    const data = snap.val() || {};
    const sellers = Object.entries(data).map(([id, s]) => {
      const safe = { ...s, id };
      delete safe.password;
      delete safe.refresh_token;
      return safe;
    }).sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: sellers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch sellers.' });
  }
});

// GET /sellers/:id — single seller full details (admin only sees phone/NIC)
router.get('/sellers/:id', async (req, res) => {
  try {
    const snap = await db.ref(`sellers/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Seller not found.' });
    const seller = snap.val();
    delete seller.password;
    delete seller.refresh_token;
    seller.id = req.params.id;
    res.json({ success: true, data: seller });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch seller.' });
  }
});

// PUT /sellers/:id/approve — approve seller application
router.put('/sellers/:id/approve', [
  body('note').optional().trim().isLength({ max: 300 }),
], async (req, res) => {
  try {
    const snap = await db.ref(`sellers/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Seller not found.' });
    const seller = snap.val();

    await db.ref(`sellers/${req.params.id}`).update({
      status: 'approved',
      is_active: 1,
      approval_note: req.body.note || '',
      approved_at: Date.now(),
      approved_by: req.admin.uid,
      updated_at: Date.now(),
    });

    // Send approval email (non-blocking)
    if (process.env.GMAIL_USER) {
      sendSellerStatusEmail(seller.email, seller.owner_name, 'approved').catch(console.error);
    }

    res.json({ success: true, message: 'Seller approved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to approve seller.' });
  }
});

// PUT /sellers/:id/reject — reject seller application
router.put('/sellers/:id/reject', [
  body('reason').trim().isLength({ min: 5, max: 300 }),
], async (req, res) => {
  if (failValidation(req, res)) return;
  try {
    const snap = await db.ref(`sellers/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Seller not found.' });
    const seller = snap.val();

    await db.ref(`sellers/${req.params.id}`).update({
      status: 'rejected',
      is_active: 0,
      approval_note: req.body.reason,
      rejected_at: Date.now(),
      rejected_by: req.admin.uid,
      updated_at: Date.now(),
    });

    if (process.env.GMAIL_USER) {
      sendSellerStatusEmail(seller.email, seller.owner_name, 'rejected', req.body.reason).catch(console.error);
    }

    res.json({ success: true, message: 'Seller application rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to reject seller.' });
  }
});

// PUT /sellers/:id/ban — ban seller (blocks phone + email + NIC/BR in blacklist)
router.put('/sellers/:id/ban', [
  body('reason').trim().isLength({ min: 5, max: 300 }),
], async (req, res) => {
  if (failValidation(req, res)) return;
  try {
    const snap = await db.ref(`sellers/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Seller not found.' });
    const seller = snap.val();

    // Add to blacklist
    const blackRef = db.ref('blacklist').push();
    const blacklistEntry = {
      email: seller.email,
      phone: seller.phone,
      nic_br: seller.nic_br,
      reason: req.body.reason,
      seller_id: req.params.id,
      banned_at: Date.now(),
      banned_by: req.admin.uid,
    };

    await db.ref().update({
      [`sellers/${req.params.id}/status`]: 'banned',
      [`sellers/${req.params.id}/is_banned`]: 1,
      [`sellers/${req.params.id}/is_active`]: 0,
      [`sellers/${req.params.id}/ban_reason`]: req.body.reason,
      [`sellers/${req.params.id}/banned_at`]: Date.now(),
      [`sellers/${req.params.id}/banned_by`]: req.admin.uid,
      [`sellers/${req.params.id}/refresh_token`]: null,
      [`blacklist/${blackRef.key}`]: blacklistEntry,
    });

    res.json({ success: true, message: 'Seller banned and added to blacklist.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to ban seller.' });
  }
});

// PUT /sellers/:id/unban — unban seller
router.put('/sellers/:id/unban', async (req, res) => {
  try {
    const snap = await db.ref(`sellers/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Seller not found.' });
    const seller = snap.val();

    // Remove from blacklist
    const blackSnap = await db.ref('blacklist').orderByChild('seller_id').equalTo(req.params.id).once('value');
    const updates = {
      [`sellers/${req.params.id}/status`]: 'approved',
      [`sellers/${req.params.id}/is_banned`]: 0,
      [`sellers/${req.params.id}/is_active`]: 1,
      [`sellers/${req.params.id}/updated_at`]: Date.now(),
    };
    blackSnap.forEach(child => { updates[`blacklist/${child.key}`] = null; });
    await db.ref().update(updates);

    res.json({ success: true, message: 'Seller unbanned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unban seller.' });
  }
});

// ═══════════════════════════════════════════════════════
// SELLER PRODUCT MANAGEMENT (approval flow)
// ═══════════════════════════════════════════════════════

// GET /seller-products — all products submitted by sellers
router.get('/seller-products', async (req, res) => {
  try {
    const snap = await db.ref('seller_products').once('value');
    const data = snap.val() || {};
    const products = Object.entries(data)
      .filter(([, p]) => !p.deleted_at)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch seller products.' });
  }
});

// PUT /seller-products/:id/approve — approve seller product → goes live on website
router.put('/seller-products/:id/approve', async (req, res) => {
  try {
    const ref = db.ref(`seller_products/${req.params.id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Product not found.' });

    await ref.update({
      approval_status: 'approved',
      is_active: 1,
      approved_at: Date.now(),
      approved_by: req.admin.uid,
      updated_at: Date.now(),
    });

    res.json({ success: true, message: 'Seller product approved and now live.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve product.' });
  }
});

// PUT /seller-products/:id/reject — reject seller product
router.put('/seller-products/:id/reject', [
  body('reason').trim().isLength({ min: 5, max: 300 }),
], async (req, res) => {
  if (failValidation(req, res)) return;
  try {
    const ref = db.ref(`seller_products/${req.params.id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Product not found.' });

    await ref.update({
      approval_status: 'rejected',
      is_active: 0,
      rejection_reason: req.body.reason,
      rejected_at: Date.now(),
      rejected_by: req.admin.uid,
      updated_at: Date.now(),
    });

    res.json({ success: true, message: 'Seller product rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject product.' });
  }
});

// ═══════════════════════════════════════════════════════
// USER MANAGEMENT (Admin)
// ═══════════════════════════════════════════════════════

// GET /users — list all customers
router.get('/users', async (req, res) => {
  try {
    const snap = await db.ref('users').once('value');
    const data = snap.val() || {};
    const users = Object.entries(data).map(([id, u]) => {
      const safe = {
        id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone || null,
        role: u.role,
        is_active: u.is_active,
        is_banned: u.is_banned || 0,
        is_verified: u.is_verified || 0,
        created_at: u.created_at,
        last_login: u.last_login || null,
      };
      return safe;
    }).sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// PUT /users/:id/ban — ban customer (email + phone blacklist)
router.put('/users/:id/ban', [
  body('reason').trim().isLength({ min: 5, max: 300 }),
], async (req, res) => {
  if (failValidation(req, res)) return;
  try {
    const snap = await db.ref(`users/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'User not found.' });
    const user = snap.val();

    const blackRef = db.ref('blacklist').push();
    await db.ref().update({
      [`users/${req.params.id}/is_banned`]: 1,
      [`users/${req.params.id}/is_active`]: 0,
      [`users/${req.params.id}/ban_reason`]: req.body.reason,
      [`users/${req.params.id}/banned_at`]: Date.now(),
      [`users/${req.params.id}/refresh_token`]: null,
      [`blacklist/${blackRef.key}`]: {
        email: user.email,
        phone: user.phone || null,
        reason: req.body.reason,
        user_id: req.params.id,
        banned_at: Date.now(),
        banned_by: req.admin.uid,
      },
    });

    res.json({ success: true, message: 'User banned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to ban user.' });
  }
});

// PUT /users/:id/unban — unban customer
router.put('/users/:id/unban', async (req, res) => {
  try {
    const snap = await db.ref(`users/${req.params.id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'User not found.' });

    const blackSnap = await db.ref('blacklist').orderByChild('user_id').equalTo(req.params.id).once('value');
    const updates = {
      [`users/${req.params.id}/is_banned`]: 0,
      [`users/${req.params.id}/is_active`]: 1,
      [`users/${req.params.id}/updated_at`]: Date.now(),
    };
    blackSnap.forEach(child => { updates[`blacklist/${child.key}`] = null; });
    await db.ref().update(updates);

    res.json({ success: true, message: 'User unbanned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unban user.' });
  }
});

// ═══════════════════════════════════════════════════════
// COUPON MANAGEMENT (Admin CRUD)
// ═══════════════════════════════════════════════════════

// GET /coupons
router.get('/coupons', async (req, res) => {
  try {
    const snap = await db.ref('coupons').once('value');
    const data = snap.val() || {};
    const coupons = Object.entries(data).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch coupons.' });
  }
});

// POST /coupons
router.post('/coupons', [
  body('code').trim().toUpperCase().isLength({ min: 3, max: 30 }).matches(/^[A-Z0-9_-]+$/),
  body('type').isIn(['percentage', 'fixed']),
  body('value').isFloat({ min: 0.01 }),
  body('min_order').optional({ nullable: true }).isFloat({ min: 0 }),
  body('max_uses').optional({ nullable: true }).isInt({ min: 1 }),
  body('expires_at').optional({ nullable: true }).isISO8601(),
], async (req, res) => {
  if (failValidation(req, res)) return;
  try {
    // Check duplicate code
    const existing = await db.ref('coupons').orderByChild('code').equalTo(req.body.code.toUpperCase()).once('value');
    if (existing.exists()) return res.status(409).json({ success: false, message: 'Coupon code already exists.' });

    const ref = db.ref('coupons').push();
    const coupon = {
      code: req.body.code.toUpperCase(),
      type: req.body.type,
      value: Number(req.body.value),
      min_order: req.body.min_order ? Number(req.body.min_order) : 0,
      max_uses: req.body.max_uses ? Number(req.body.max_uses) : null,
      uses_count: 0,
      expires_at: req.body.expires_at ? new Date(req.body.expires_at).getTime() : null,
      is_active: 1,
      created_by: req.admin.uid,
      created_at: Date.now(),
    };
    await ref.set(coupon);
    res.status(201).json({ success: true, data: { id: ref.key, ...coupon } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create coupon.' });
  }
});

// PUT /coupons/:id
router.put('/coupons/:id', [
  body('is_active').optional().isIn([0, 1]),
  body('value').optional().isFloat({ min: 0.01 }),
  body('expires_at').optional({ nullable: true }),
], async (req, res) => {
  try {
    const ref = db.ref(`coupons/${req.params.id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Coupon not found.' });

    const allowed = ['is_active', 'value', 'min_order', 'max_uses', 'expires_at'];
    const updates = { updated_at: Date.now(), updated_by: req.admin.uid };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await ref.update(updates);
    res.json({ success: true, message: 'Coupon updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update coupon.' });
  }
});

// DELETE /coupons/:id
router.delete('/coupons/:id', async (req, res) => {
  try {
    await db.ref(`coupons/${req.params.id}`).remove();
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete coupon.' });
  }
});

// ═══════════════════════════════════════════════════════
// SHOP SETTINGS
// ═══════════════════════════════════════════════════════

// GET /settings
router.get('/settings', async (req, res) => {
  try {
    const snap = await db.ref('config').once('value');
    res.json({ success: true, data: snap.val() || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
});

// PUT /settings
router.put('/settings', [
  body('whatsapp_number').optional().trim().isLength({ min: 10, max: 15 }),
  body('shop_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('free_delivery_threshold').optional().isFloat({ min: 0 }),
  body('delivery_fee').optional().isFloat({ min: 0 }),
], async (req, res) => {
  try {
    const allowed = ['whatsapp_number', 'shop_name', 'shop_address', 'free_delivery_threshold', 'delivery_fee'];
    const updates = { updated_at: Date.now(), updated_by: req.admin.uid };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await db.ref('config').update(updates);
    res.json({ success: true, message: 'Settings saved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save settings.' });
  }
});

// ═══════════════════════════════════════════════════════
// ORDER APPROVAL + SELLER NOTIFICATION
// ═══════════════════════════════════════════════════════

// PUT /orders/:id/approve-and-assign
router.put('/orders/:id/approve-and-assign', [
  body('seller_id').trim().isLength({ min: 6, max: 160 }),
], async (req, res) => {
  if (failValidation(req, res)) return;
  try {
    const orderRef = db.ref(`orders/${req.params.id}`);
    const orderSnap = await orderRef.once('value');
    const order = orderSnap.val();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const sellerSnap = await db.ref(`sellers/${req.body.seller_id}`).once('value');
    const seller = sellerSnap.val();
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });

    await orderRef.update({
      status: 'confirmed',
      assigned_seller_id: req.body.seller_id,
      assigned_seller_name: seller.business_name,
      approved_at: Date.now(),
      approved_by: req.admin.uid,
      updated_at: Date.now(),
    });

    // Generate WhatsApp notification URL for seller
    const shopWA = process.env.SHOP_WHATSAPP || '0776338514';
    let waMsg = `*New Order Assigned — ${order.order_number}*\n`;
    waMsg += `Customer: ${order.customer_name}\n`;
    waMsg += `Phone: ${order.shipping_address?.phone}\n`;
    waMsg += `Address: ${order.shipping_address?.address}\n\nItems:\n`;
    (order.items || []).forEach(i => { waMsg += `- ${i.name} ×${i.quantity} = Rs.${i.total}\n`; });
    waMsg += `\nTotal: Rs.${order.total}`;

    const sellerWaUrl = `https://wa.me/${seller.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`;

    // Also notify via email (non-blocking)
    if (process.env.GMAIL_USER && seller.email) {
      sendOrderNotificationEmail(seller.email, seller.owner_name, order.order_number, order.items || []).catch(console.error);
    }

    res.json({
      success: true,
      message: 'Order approved and assigned to seller.',
      seller_whatsapp_url: sellerWaUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to approve order.' });
  }
});

// ═══════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════

// GET /dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [sellersSnap, usersSnap, ordersSnap, sellerProductsSnap, salesSnap] = await Promise.all([
      db.ref('sellers').once('value'),
      db.ref('users').once('value'),
      db.ref('orders').once('value'),
      db.ref('seller_products').once('value'),
      db.ref('sales').once('value'),
    ]);

    const sellers = sellersSnap.val() || {};
    const users = usersSnap.val() || {};
    const orders = ordersSnap.val() || {};
    const sellerProducts = sellerProductsSnap.val() || {};
    const sales = salesSnap.val() || {};

    const pendingSellers = Object.values(sellers).filter(s => s.status === 'pending').length;
    const approvedSellers = Object.values(sellers).filter(s => s.status === 'approved').length;
    const pendingProducts = Object.values(sellerProducts).filter(p => p.approval_status === 'pending' && !p.deleted_at).length;
    const totalUsers = Object.keys(users).length;
    const pendingOrders = Object.values(orders).filter(o => o.status === 'pending').length;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaySales = Object.values(sales).filter(s => s.created_at >= todayStart.getTime() && !s.isReturn);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);

    res.json({
      success: true,
      data: {
        pending_sellers: pendingSellers,
        approved_sellers: approvedSellers,
        pending_products: pendingProducts,
        total_users: totalUsers,
        pending_orders: pendingOrders,
        today_revenue: todayRevenue,
        today_sales_count: todaySales.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// ═══════════════════════════════════════════════════════
// CATEGORIES MANAGEMENT
// ═══════════════════════════════════════════════════════

// GET /categories — with seller filter option
router.get('/categories', async (req, res) => {
  try {
    const { seller_id } = req.query;
    const snap = await db.ref('categories').once('value');
    let cats = Object.entries(snap.val() || {}).map(([id, c]) => ({ id, ...c }));

    if (seller_id) {
      // Get categories from seller's products
      const sellerProdSnap = await db.ref('seller_products')
        .orderByChild('seller_id').equalTo(seller_id).once('value');
      const sellerCats = new Set();
      sellerProdSnap.forEach(child => {
        const p = child.val();
        if (p.category_slug && !p.deleted_at) sellerCats.add(p.category_slug);
      });
      cats = cats.filter(c => sellerCats.has(c.slug));
    }

    res.json({ success: true, data: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

module.exports = router;

