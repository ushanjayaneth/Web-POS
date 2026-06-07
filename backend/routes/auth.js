const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/firebase');
const { sendVerificationEmail } = require('../utils/mailer');
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

// ─── REGISTER ───────────────────────────────────────────────────────────────
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
    // Check blacklist
    const blacklistSnap = await db.ref('blacklist').orderByChild('email').equalTo(email).once('value');
    if (blacklistSnap.exists()) {
      return res.status(403).json({ success: false, message: 'This account has been banned.' });
    }
    if (phone) {
      const phoneBlacklistSnap = await db.ref('blacklist').orderByChild('phone').equalTo(phone).once('value');
      if (phoneBlacklistSnap.exists()) {
        return res.status(403).json({ success: false, message: 'This phone number has been banned.' });
      }
    }

    const existingSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (existingSnapshot.exists()) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const { accessToken, refreshToken } = generateTokens(userId);

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const newUser = {
      uuid: userId,
      first_name,
      last_name,
      email,
      password: hashed,
      phone: phone || null,
      role: 'customer',
      is_verified: 0,           // Email not yet verified
      is_active: 1,
      is_banned: 0,
      refresh_token: refreshToken,
      email_verify_token: verifyToken,
      email_verify_expiry: verifyExpiry,
      created_at: Date.now(),
    };

    await db.ref(`users/${userId}`).set(newUser);

    // Send verification email (non-blocking)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      sendVerificationEmail(email, first_name, verifyToken).catch(err =>
        console.error('Email send error:', err.message)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        accessToken,
        refreshToken,
        user: { id: userId, first_name, last_name, email, role: 'customer', is_verified: 0 },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token required.' });

  try {
    const usersSnap = await db.ref('users').orderByChild('email_verify_token').equalTo(token).once('value');
    if (!usersSnap.exists()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
    }

    let userId = null;
    let user = null;
    usersSnap.forEach(child => { userId = child.key; user = child.val(); });

    if (!user.email_verify_expiry || Date.now() > user.email_verify_expiry) {
      return res.status(400).json({ success: false, message: 'Verification link has expired. Please request a new one.' });
    }

    await db.ref(`users/${userId}`).update({
      is_verified: 1,
      email_verify_token: null,
      email_verify_expiry: null,
      verified_at: Date.now(),
    });

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

// ─── RESEND VERIFICATION EMAIL ───────────────────────────────────────────────
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const snap = await db.ref('users').orderByChild('email').equalTo(req.body.email).once('value');
    if (!snap.exists()) return res.status(200).json({ success: true, message: 'If that email exists, a verification link was sent.' });

    let userId = null; let user = null;
    snap.forEach(child => { userId = child.key; user = child.val(); });

    if (user.is_verified) return res.status(400).json({ success: false, message: 'Email already verified.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = Date.now() + 24 * 60 * 60 * 1000;

    await db.ref(`users/${userId}`).update({ email_verify_token: verifyToken, email_verify_expiry: verifyExpiry });

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      sendVerificationEmail(user.email, user.first_name, verifyToken).catch(err =>
        console.error('Email send error:', err.message)
      );
    }

    res.json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resend verification.' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
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

    let userId = null; let user = null;
    userSnapshot.forEach(child => { userId = child.key; user = child.val(); });

    if (!user.is_active || user.is_banned) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated or banned.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const { accessToken, refreshToken } = generateTokens(userId);
    await db.ref(`users/${userId}`).update({
      refresh_token: refreshToken,
      last_login: Date.now(),
    });

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: userId,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          is_verified: user.is_verified || 0,
          seller_id: user.seller_id || null,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });
  try {
    const decoded = jwt.verify(refreshToken, getJwtSecret('JWT_REFRESH_SECRET', 'dev_refresh_token_secret_change_me'));
    const userSnapshot = await db.ref(`users/${decoded.id}`).once('value');
    const user = userSnapshot.val();

    if (!user || user.refresh_token !== refreshToken || user.is_banned) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.id);
    await db.ref(`users/${decoded.id}`).update({ refresh_token: newRefresh });

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
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

// ─── GET ME ───────────────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  const userSnapshot = await db.ref(`users/${req.user.id}`).once('value');
  const user = userSnapshot.val();
  if (user) {
    delete user.password;
    delete user.refresh_token;
    delete user.email_verify_token;
    delete user.email_verify_expiry;
    user.id = req.user.id;
  }
  res.json({ success: true, data: user });
});

module.exports = router;
