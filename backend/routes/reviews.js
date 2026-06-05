const express = require('express');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET reviews for a product
router.get('/product/:id', async (req, res) => {
  try {
    const snapshot = await db.ref('reviews').orderByChild('product_id').equalTo(req.params.id).once('value');
    const data = snapshot.val();
    const reviews = [];
    if (data) {
      for (const key of Object.keys(data)) {
        if (data[key].is_approved) {
          reviews.push({ id: key, ...data[key] });
        }
      }
    }
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// POST a review
router.post('/', protect, async (req, res) => {
  const { product_id, rating, comment } = req.body;
  if (!product_id || !rating) return res.status(400).json({ success: false, message: 'Missing fields' });

  try {
    // Check if user already reviewed
    const existingRef = await db.ref('reviews').orderByChild('user_id').equalTo(req.user.id).once('value');
    let hasReviewed = false;
    existingRef.forEach(child => {
      if (child.val().product_id === product_id) hasReviewed = true;
    });

    if (hasReviewed) return res.status(400).json({ success: false, message: 'You already reviewed this product.' });

    const reviewData = {
      product_id,
      user_id: req.user.id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      rating: Number(rating),
      comment: comment || '',
      is_approved: true, // Auto approve for now
      created_at: Date.now()
    };

    await db.ref('reviews').push(reviewData);

    // Update product rating average
    const pRef = db.ref(`products/${product_id}`);
    const pSnap = await pRef.once('value');
    const p = pSnap.val();
    if (p) {
      const newCount = (p.rating_count || 0) + 1;
      const newAvg = (((p.rating_avg || 0) * (p.rating_count || 0)) + rating) / newCount;
      await pRef.update({ rating_avg: newAvg, rating_count: newCount });
    }

    res.status(201).json({ success: true, message: 'Review submitted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

module.exports = router;
