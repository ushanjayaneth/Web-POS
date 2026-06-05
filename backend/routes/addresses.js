const express = require('express');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET all addresses for user
router.get('/', protect, async (req, res) => {
  try {
    const addressesSnapshot = await db.ref(`addresses/${req.user.id}`).once('value');
    const data = addressesSnapshot.val();
    const addresses = [];
    
    if (data) {
      for (const key of Object.keys(data)) {
        addresses.push({ id: key, ...data[key] });
      }
    }
    
    res.json({ success: true, data: addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch addresses.' });
  }
});

// ADD new address
router.post('/', protect, async (req, res) => {
  try {
    const newAddressRef = db.ref(`addresses/${req.user.id}`).push();
    const newAddress = {
      ...req.body,
      created_at: Date.now()
    };
    
    await newAddressRef.set(newAddress);
    res.status(201).json({ success: true, data: { id: newAddressRef.key, ...newAddress } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add address.' });
  }
});

// DELETE address
router.delete('/:id', protect, async (req, res) => {
  try {
    await db.ref(`addresses/${req.user.id}/${req.params.id}`).remove();
    res.json({ success: true, message: 'Address removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove address.' });
  }
});

module.exports = router;
