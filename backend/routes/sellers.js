const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const { sendSellerStatusEmail } = require('../utils/mailer');
const router = express.Router();

const slugify = (str) =>
  String(str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120);

// ─── SELLER REGISTER (Public — creates request, needs admin approval) ─────────
router.post('/register', [
  body('business_name').trim().isLength({ min: 2, max: 120 }),
  body('owner_name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 9, max: 15 }),
  body('nic_br').trim().isLength({ min: 5, max: 30 }),
  body('address').trim().isLength({ min: 5, max: 300 }),
  body('categories').isArray({ min: 1, max: 10 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { business_name, owner_name, email, phone, nic_br, address, categories, description, password } = req.body;

  try {
    // Check blacklist (email, phone, nic_br)
    const [emailBlack, phoneBlack, nicBlack] = await Promise.all([
      db.ref('blacklist').orderByChild('email').equalTo(email).once('value'),
      db.ref('blacklist').orderByChild('phone').equalTo(phone).once('value'),
      db.ref('blacklist').orderByChild('nic_br').equalTo(nic_br).once('value'),
    ]);
    if (emailBlack.exists() || phoneBlack.exists() || nicBlack.exists()) {
      return res.status(403).json({ success: false, message: 'Your account or phone number has been banned from this platform.' });
    }

    // Check if email already used by a seller
    const existingSnap = await db.ref('sellers').orderByChild('email').equalTo(email).once('value');
    if (existingSnap.exists()) {
      return res.status(409).json({ success: false, message: 'A seller account with this email already exists.' });
    }

    // Check if email used by a customer
    const userSnap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (userSnap.exists()) {
      return res.status(409).json({ success: false, message: 'This email is already registered as a customer account.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const sellerId = uuidv4();

    const sellerData = {
      id: sellerId,
      business_name,
      owner_name,
      email,
      phone,
      nic_br,
      address,
      categories,
      description: description || '',
      password: hashed,
      status: 'pending',         // pending | approved | rejected | banned
      is_active: 0,              // Only active after admin approves
      is_banned: 0,
      approval_note: '',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await db.ref(`sellers/${sellerId}`).set(sellerData);

    res.status(201).json({
      success: true,
      message: 'Your seller application has been submitted. You will be notified via email once reviewed.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit seller application.' });
  }
});

// ─── SELLER LOGIN ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const getJwtSecret = (name, fallback) => process.env[name] || fallback;

const generateSellerTokens = (sellerId) => ({
  accessToken: jwt.sign(
    { id: sellerId, type: 'seller' },
    getJwtSecret('JWT_SECRET', 'dev_access_token_secret_change_me'),
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  ),
  refreshToken: jwt.sign(
    { id: sellerId, type: 'seller' },
    getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'),
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  ),
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  try {
    const snap = await db.ref('sellers').orderByChild('email').equalTo(email).once('value');
    if (!snap.exists()) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    let sellerId = null; let seller = null;
    snap.forEach(child => { sellerId = child.key; seller = child.val(); });

    if (seller.is_banned || seller.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your seller account has been banned.' });
    }

    if (seller.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Your application is pending admin approval.' });
    }

    if (seller.status === 'rejected') {
      return res.status(403).json({ success: false, message: 'Your application was rejected. Contact admin for details.' });
    }

    const match = await bcrypt.compare(password, seller.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const { accessToken, refreshToken } = generateSellerTokens(sellerId);
    await db.ref(`sellers/${sellerId}`).update({ refresh_token: refreshToken, last_login: Date.now() });

    const safeSeller = {
      id: sellerId,
      business_name: seller.business_name,
      owner_name: seller.owner_name,
      email: seller.email,
      categories: seller.categories,
      status: seller.status,
    };

    res.json({ success: true, data: { accessToken, refreshToken, seller: safeSeller } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// ─── SELLER REFRESH TOKEN ─────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });
  try {
    const decoded = jwt.verify(refreshToken, getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'));
    if (decoded.type !== 'seller') return res.status(401).json({ success: false, message: 'Invalid token type.' });

    const snap = await db.ref(`sellers/${decoded.id}`).once('value');
    const seller = snap.val();
    if (!seller || seller.refresh_token !== refreshToken || seller.is_banned) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const { accessToken, refreshToken: newRefresh } = generateSellerTokens(decoded.id);
    await db.ref(`sellers/${decoded.id}`).update({ refresh_token: newRefresh });
    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

// ─── SELLER LOGOUT ────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'));
      if (decoded.type === 'seller') {
        await db.ref(`sellers/${decoded.id}`).update({ refresh_token: null });
      }
    } catch {}
  }
  res.json({ success: true, message: 'Logged out.' });
});

// ─── GET OWN PROFILE ─────────────────────────────────────────────────────────
const { protectSeller } = require('../middleware/sellerAuth');

router.get('/me', protectSeller, async (req, res) => {
  const snap = await db.ref(`sellers/${req.seller.id}`).once('value');
  const seller = snap.val();
  if (seller) {
    delete seller.password;
    delete seller.refresh_token;
    seller.id = req.seller.id;
  }
  res.json({ success: true, data: seller });
});

// ─── UPDATE OWN PROFILE ───────────────────────────────────────────────────────
router.put('/me', protectSeller, [
  body('business_name').optional().trim().isLength({ min: 2, max: 120 }),
  body('address').optional().trim().isLength({ max: 300 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('categories').optional().isArray({ min: 1, max: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const allowed = ['business_name', 'address', 'description', 'categories'];
  const updates = {};
  allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
  updates.updated_at = Date.now();

  try {
    await db.ref(`sellers/${req.seller.id}`).update(updates);
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ─── SELLER PRODUCTS (own) ────────────────────────────────────────────────────
router.get('/products', protectSeller, async (req, res) => {
  try {
    const snap = await db.ref('seller_products').orderByChild('seller_id').equalTo(req.seller.id).once('value');
    const data = snap.val() || {};
    const products = Object.entries(data).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// ─── SELLER ADD PRODUCT ───────────────────────────────────────────────────────
const MAX_SELLER_IMAGES = 4;
const MAX_IMAGE_CHARS = 1_500_000;

const isSafeImage = (v) => {
  if (typeof v !== 'string' || v.length > MAX_IMAGE_CHARS) return false;
  if (/^https:\/\/[^\s]+$/i.test(v)) return true;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i.test(v);
};

router.post('/products', protectSeller, [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('category_name').trim().isLength({ min: 1, max: 80 }),
  body('price').isFloat({ min: 0 }),
  body('sale_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  body('stock').isInt({ min: 0, max: 1_000_000 }),
  body('description').optional().trim().isLength({ max: 3000 }),
  body('images').optional().isArray({ max: MAX_SELLER_IMAGES }),
  body('images.*').optional().custom(isSafeImage).withMessage('Invalid image format.'),
  body('wholesale_tiers').optional().isArray(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const name = String(req.body.name || '').trim().slice(0, 120);
    const categoryName = String(req.body.category_name || '').trim().slice(0, 80);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120);

    const productRef = db.ref('seller_products').push();
    const productData = {
      id: productRef.key,
      name,
      slug,
      category_name: categoryName,
      category_slug: slugify(req.body.category_slug || categoryName),
      price: Number(req.body.price),
      sale_price: req.body.sale_price ? Number(req.body.sale_price) : null,
      stock: Math.max(0, Math.floor(Number(req.body.stock))),
      description: String(req.body.description || '').trim().slice(0, 3000),
      images: Array.isArray(req.body.images) ? req.body.images.filter(isSafeImage).slice(0, MAX_SELLER_IMAGES) : [],
      wholesale_tiers: Array.isArray(req.body.wholesale_tiers) ? req.body.wholesale_tiers.slice(0, 5) : [],
      seller_id: req.seller.id,
      seller_name: req.seller.business_name,
      approval_status: 'pending',   // pending | approved | rejected
      is_active: 0,                 // Only active after admin approves
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await productRef.set(productData);
    res.status(201).json({ success: true, message: 'Product submitted for admin review.', data: productData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit product.' });
  }
});

// ─── SELLER UPDATE OWN PRODUCT ────────────────────────────────────────────────
router.put('/products/:id', protectSeller, [
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
], async (req, res) => {
  try {
    const ref = db.ref(`seller_products/${req.params.id}`);
    const snap = await ref.once('value');
    const product = snap.val();

    if (!product || product.seller_id !== req.seller.id) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const allowed = ['name', 'price', 'sale_price', 'stock', 'description', 'images', 'wholesale_tiers', 'category_name'];
    const updates = { updated_at: Date.now(), approval_status: 'pending', is_active: 0 };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await ref.update(updates);
    res.json({ success: true, message: 'Product updated. Pending re-approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// ─── SELLER DELETE OWN PRODUCT ────────────────────────────────────────────────
router.delete('/products/:id', protectSeller, async (req, res) => {
  try {
    const ref = db.ref(`seller_products/${req.params.id}`);
    const snap = await ref.once('value');
    const product = snap.val();

    if (!product || product.seller_id !== req.seller.id) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await ref.update({ deleted_at: Date.now(), is_active: 0 });
    res.json({ success: true, message: 'Product removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

router.get('/orders', protectSeller, async (req, res) => {
  try {
    const snap = await db.ref('orders').once('value');
    const data = snap.val() || {};
    const orders = [];
    Object.entries(data).forEach(([id, order]) => {
      const sellerItems = (order.items || []).filter(item => item.seller_id === req.seller.id);
      if (sellerItems.length > 0) {
        orders.push({
          ...order,
          id,
          items: sellerItems,
          seller_subtotal: sellerItems.reduce((acc, item) => acc + item.total, 0)
        });
      }
    });
    orders.sort((a, b) => b.created_at - a.created_at);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

module.exports = router;
