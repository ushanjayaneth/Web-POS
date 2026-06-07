const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// VALIDATE coupon (Public)
router.post('/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Coupon code required' });
  
  try {
    const snap = await db.ref('coupons').orderByChild('code').equalTo(code.toUpperCase()).once('value');
    let couponId = null;
    let coupon = null;
    snap.forEach(child => {
      couponId = child.key;
      coupon = child.val();
    });
    
    if (!coupon || coupon.is_active === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon' });
    }

    if (coupon.expiry_date && Date.now() > coupon.expiry_date) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (coupon.min_subtotal && subtotal < coupon.min_subtotal) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum order amount of Rs. ${coupon.min_subtotal} required to use this coupon` 
      });
    }
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else if (coupon.type === 'fixed') {
      discount = coupon.value;
    }

    if (discount > subtotal) discount = subtotal;
    
    res.json({ success: true, data: { coupon: { ...coupon, id: couponId }, discount } });
  } catch(err) {
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
});

// GET all coupons (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const snap = await db.ref('coupons').once('value');
    const coupons = [];
    snap.forEach(child => {
      coupons.push({ id: child.key, ...child.val() });
    });
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

// CREATE coupon (Admin only)
router.post('/', [
  protect,
  authorize('admin'),
  body('code').trim().notEmpty().toUpperCase().escape(),
  body('type').isIn(['percentage', 'fixed']),
  body('value').isNumeric().isFloat({ min: 0 }),
  body('is_active').optional().isIn([0, 1]),
  body('min_subtotal').optional().isNumeric(),
  body('max_discount').optional().isNumeric(),
  body('expiry_date').optional().isNumeric(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { code, type, value, is_active, min_subtotal, max_discount, expiry_date } = req.body;
  try {
    // Check if code already exists
    const existingSnap = await db.ref('coupons').orderByChild('code').equalTo(code).once('value');
    if (existingSnap.exists()) {
      return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    }

    const newCoupon = {
      code,
      type,
      value: Number(value),
      is_active: is_active !== undefined ? Number(is_active) : 1,
      min_subtotal: min_subtotal ? Number(min_subtotal) : 0,
      max_discount: max_discount ? Number(max_discount) : null,
      expiry_date: expiry_date ? Number(expiry_date) : null,
      created_at: Date.now()
    };

    const newRef = db.ref('coupons').push();
    await newRef.set(newCoupon);

    res.status(201).json({ success: true, message: 'Coupon created successfully', data: { id: newRef.key, ...newCoupon } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
});

// UPDATE coupon (Admin only)
router.put('/:id', [
  protect,
  authorize('admin'),
  body('code').optional().trim().notEmpty().toUpperCase().escape(),
  body('type').optional().isIn(['percentage', 'fixed']),
  body('value').optional().isNumeric().isFloat({ min: 0 }),
  body('is_active').optional().isIn([0, 1]),
  body('min_subtotal').optional().isNumeric(),
  body('max_discount').optional().isNumeric(),
  body('expiry_date').optional().isNumeric(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { id } = req.params;
  const { code, type, value, is_active, min_subtotal, max_discount, expiry_date } = req.body;
  try {
    const snap = await db.ref(`coupons/${id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Coupon not found' });

    if (code) {
      const existingSnap = await db.ref('coupons').orderByChild('code').equalTo(code).once('value');
      let codeExists = false;
      existingSnap.forEach(child => {
        if (child.key !== id) codeExists = true;
      });
      if (codeExists) {
        return res.status(409).json({ success: false, message: 'Coupon code already exists' });
      }
    }

    const updates = {};
    if (code) updates.code = code;
    if (type) updates.type = type;
    if (value !== undefined) updates.value = Number(value);
    if (is_active !== undefined) updates.is_active = Number(is_active);
    if (min_subtotal !== undefined) updates.min_subtotal = Number(min_subtotal);
    if (max_discount !== undefined) updates.max_discount = max_discount ? Number(max_discount) : null;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date ? Number(expiry_date) : null;
    updates.updated_at = Date.now();

    await db.ref(`coupons/${id}`).update(updates);
    const updatedSnap = await db.ref(`coupons/${id}`).once('value');
    res.json({ success: true, message: 'Coupon updated successfully', data: { id, ...updatedSnap.val() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
});

// DELETE coupon (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const snap = await db.ref(`coupons/${id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ success: false, message: 'Coupon not found' });

    await db.ref(`coupons/${id}`).remove();
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
});

module.exports = router;
