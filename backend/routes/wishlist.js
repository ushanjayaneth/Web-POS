const express = require('express');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

const toPublicProduct = (product, id) => ({
  id,
  name: product.name,
  slug: product.slug || id,
  price: Number(product.price || 0),
  sale_price: product.sale_price ?? null,
  stock: Number(product.stock || 0),
  category_name: product.category_name || '',
  category_slug: product.category_slug || product.category_id || '',
  description: product.description || '',
  images: Array.isArray(product.images) ? product.images : [],
  is_featured: product.is_featured || 0,
  rating_avg: product.rating_avg || 0,
  rating_count: product.rating_count || 0,
});

// GET wishlist
router.get('/', protect, async (req, res) => {
  try {
    const snapshot = await db.ref(`wishlist/${req.user.id}`).once('value');
    const data = snapshot.val();
    const items = [];
    
    if (data) {
      for (const productId of Object.keys(data)) {
        const pSnap = await db.ref(`products/${productId}`).once('value');
        const product = pSnap.val();
        if (product && !product.deleted_at && product.is_active !== 0 && product.is_active !== false) {
          items.push(toPublicProduct(product, productId));
        }
      }
    }
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
});

// TOGGLE wishlist
router.post('/toggle', protect, async (req, res) => {
  const { product_id } = req.body;
  try {
    const refPath = `wishlist/${req.user.id}/${product_id}`;
    const snap = await db.ref(refPath).once('value');
    
    let added = false;
    if (snap.exists()) {
      await db.ref(refPath).remove();
    } else {
      await db.ref(refPath).set(Date.now());
      added = true;
    }
    
    res.json({ success: true, message: added ? 'Added to wishlist' : 'Removed from wishlist', added });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle wishlist.' });
  }
});

module.exports = router;
