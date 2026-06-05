const express = require('express');
const db = require('../database/firebase');
const router = express.Router();

router.post('/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  try {
    const snap = await db.ref('coupons').orderByChild('code').equalTo(code.toUpperCase()).once('value');
    let coupon = null;
    snap.forEach(child => { coupon = child.val(); });
    
    if (!coupon || coupon.is_active === 0) return res.status(404).json({ success: false, message: 'Invalid coupon' });
    
    let discount = 0;
    if (coupon.type === 'percentage') discount = (subtotal * coupon.value) / 100;
    else if (coupon.type === 'fixed') discount = coupon.value;
    
    res.json({ success: true, data: { coupon, discount } });
  } catch(err) {
    res.status(500).json({ success: false, message: 'Failed to validate' });
  }
});

module.exports = router;
