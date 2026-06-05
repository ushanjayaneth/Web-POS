const express = require('express');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET profile
router.get('/profile', protect, async (req, res) => {
  try {
    const snapshot = await db.ref(`users/${req.user.id}`).once('value');
    const user = snapshot.val();
    if (user) {
      delete user.password;
      delete user.refresh_token;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// UPDATE profile
router.put('/profile', protect, async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  try {
    await db.ref(`users/${req.user.id}`).update({
      first_name: first_name || req.user.first_name,
      last_name: last_name || req.user.last_name,
      phone: phone || req.user.phone,
      updated_at: Date.now()
    });
    
    const newSnap = await db.ref(`users/${req.user.id}`).once('value');
    const updatedUser = newSnap.val();
    delete updatedUser.password;
    delete updatedUser.refresh_token;
    
    res.json({ success: true, message: 'Profile updated', data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;
