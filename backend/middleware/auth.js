const jwt = require('jsonwebtoken');
const db = require('../database/firebase');

const getJwtSecret = (name, fallback) => {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured in production.`);
  }
  return value || fallback;
};

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token required.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret('JWT_SECRET', 'dev_access_token_secret_change_me'));
    const userSnapshot = await db.ref(`users/${decoded.id}`).once('value');
    const user = userSnapshot.val();
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }
    user.id = decoded.id;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access forbidden. Insufficient permissions.' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret('JWT_SECRET', 'dev_access_token_secret_change_me'));
    const userSnapshot = await db.ref(`users/${decoded.id}`).once('value');
    const user = userSnapshot.val();
    if (user) {
      user.id = decoded.id;
      req.user = user;
    }
  } catch {}
  next();
};

module.exports = { protect, authorize, optionalAuth };
