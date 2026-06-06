const express = require('express');
const db = require('../database/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all categories
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const snapshot = await db.ref('categories').once('value');
    const data = snapshot.val();
    let categories = [];
    if (data) {
      categories = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    }
    
    // Sort logic
    categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // Optional: filter active
    categories = categories.filter(c => c.is_active !== 0 && c.is_active !== false);

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET single category
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const snapshot = await db.ref('categories').orderByChild('slug').equalTo(slug).once('value');
    let cat = null;
    snapshot.forEach(child => {
      cat = { id: child.key, ...child.val() };
    });

    if (!cat) {
      const idSnapshot = await db.ref(`categories/${slug}`).once('value');
      if (idSnapshot.exists()) {
        cat = { id: slug, ...idSnapshot.val() };
      }
    }

    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch category.' });
  }
});

// Since POS manages it, we might not need these active, but kept for compatibility
router.post('/', protect, authorize('admin'), async (req, res) => {
  res.status(403).json({ success: false, message: 'Managed via Firebase Admin' });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  res.status(403).json({ success: false, message: 'Managed via Firebase Admin' });
});

module.exports = router;
