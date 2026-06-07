const jwt = require('jsonwebtoken');
const db = require('../database/firebase');

const getJwtSecret = (name, fallback) => process.env[name] || fallback;

/**
 * Middleware to protect seller-only routes.
 * Verifies JWT and checks seller is active and not banned.
 */
const protectSeller = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Seller token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret('JWT_SECRET', 'dev_access_token_secret_change_me'));

    if (decoded.type !== 'seller') {
      return res.status(403).json({ success: false, message: 'Seller access required.' });
    }

    const snap = await db.ref(`sellers/${decoded.id}`).once('value');
    const seller = snap.val();

    if (!seller) {
      return res.status(401).json({ success: false, message: 'Seller account not found.' });
    }

    if (seller.is_banned || seller.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your seller account has been banned.' });
    }

    if (seller.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Seller account not yet approved.' });
    }

    seller.id = decoded.id;
    req.seller = seller;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

module.exports = { protectSeller };
