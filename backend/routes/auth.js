const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/firebase');
const router = express.Router();

const getJwtSecret = (name, fallback) => {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured in production.`);
  }
  return value || fallback;
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    getJwtSecret('JWT_SECRET', 'dev_access_token_secret_change_me'),
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'),
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  return { accessToken, refreshToken };
};

// REGISTER
router.post('/register', [
  body('first_name').trim().notEmpty().isLength({ min: 2, max: 50 }).escape(),
  body('last_name').trim().notEmpty().isLength({ min: 2, max: 50 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('phone').optional().isMobilePhone(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { first_name, last_name, email, password, phone } = req.body;
  try {
    const existingSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (existingSnapshot.exists()) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    
    const { accessToken, refreshToken } = generateTokens(userId);

    const newUser = {
      uuid: userId,
      first_name,
      last_name,
      email,
      password: hashed,
      phone: phone || null,
      role: 'customer',
      is_verified: 1,
      is_active: 1,
      refresh_token: refreshToken,
      created_at: Date.now()
    };

    await db.ref(`users/${userId}`).set(newUser);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: { accessToken, refreshToken, user: { id: userId, first_name, last_name, email, role: 'customer' } }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

// LOGIN
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  try {
    const userSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (!userSnapshot.exists()) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    let userId = null;
    let user = null;
    userSnapshot.forEach(child => {
      userId = child.key;
      user = child.val();
    });

    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account deactivated.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const { accessToken, refreshToken } = generateTokens(userId);
    await db.ref(`users/${userId}`).update({
      refresh_token: refreshToken,
      last_login: Date.now()
    });

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        accessToken, refreshToken,
        user: { id: userId, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, avatar: user.avatar }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });
  try {
    const decoded = jwt.verify(refreshToken, getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'));
    const userSnapshot = await db.ref(`users/${decoded.id}`).once('value');
    const user = userSnapshot.val();
    
    if (!user || user.refresh_token !== refreshToken) return res.status(401).json({ success: false, message: 'Invalid refresh token.' });

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.id);
    await db.ref(`users/${decoded.id}`).update({ refresh_token: newRefresh });

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'));
      await db.ref(`users/${decoded.id}`).update({ refresh_token: null });
    } catch {}
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET ME
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  const userSnapshot = await db.ref(`users/${req.user.id}`).once('value');
  const user = userSnapshot.val();
  if (user) {
    delete user.password;
    delete user.refresh_token;
    user.id = req.user.id;
  }
  res.json({ success: true, data: user });
});

module.exports = router;
