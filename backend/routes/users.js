const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
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
router.put('/profile', [
  protect,
  body('first_name').optional().trim().notEmpty().isLength({ min: 2, max: 50 }).escape(),
  body('last_name').optional().trim().notEmpty().isLength({ min: 2, max: 50 }).escape(),
  body('phone').optional().isMobilePhone(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { first_name, last_name, phone } = req.body;
  try {
    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (phone) updates.phone = phone;
    updates.updated_at = Date.now();

    await db.ref(`users/${req.user.id}`).update(updates);
    
    const newSnap = await db.ref(`users/${req.user.id}`).once('value');
    const updatedUser = newSnap.val();
    delete updatedUser.password;
    delete updatedUser.refresh_token;
    
    res.json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// CHANGE password
router.put('/change-password', [
  protect,
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { oldPassword, newPassword } = req.body;
  try {
    const snapshot = await db.ref(`users/${req.user.id}`).once('value');
    const user = snapshot.val();

    if (!user || !user.password) {
      return res.status(400).json({ success: false, message: 'User password not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await db.ref(`users/${req.user.id}`).update({
      password: hashedNewPassword,
      updated_at: Date.now()
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router;
