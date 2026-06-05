const db = require('../database/firebase');
const { admin } = db;

const parseList = (value) => (
  value
    ? value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
    : []
);

const adminEmails = parseList(process.env.ADMIN_EMAILS);
const adminUids = parseList(process.env.ADMIN_UIDS);
const staffRoles = new Set(['admin', 'owner', 'manager', 'staff']);

const isAllowedByDatabase = async (decodedToken) => {
  const adminSnapshot = await db.ref(`admins/${decodedToken.uid}`).once('value');
  const adminRecord = adminSnapshot.val();
  if (adminRecord === true || adminRecord?.active === true) return true;

  const userSnapshot = await db.ref(`users/${decodedToken.uid}`).once('value');
  const userRecord = userSnapshot.val();
  return Boolean(userRecord?.is_active && staffRoles.has(String(userRecord.role || '').toLowerCase()));
};

const verifyFirebaseAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Admin authentication required.' });
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    const email = String(decodedToken.email || '').toLowerCase();
    const uid = String(decodedToken.uid || '').toLowerCase();

    const allowedByEnv = adminEmails.includes(email) || adminUids.includes(uid);
    const allowedByDb = await isAllowedByDatabase(decodedToken);

    if (!allowedByEnv && !allowedByDb) {
      return res.status(403).json({
        success: false,
        message: 'This Firebase account is not allowed to manage the store.',
      });
    }

    req.admin = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
    };

    return next();
  } catch (err) {
    console.error('Admin auth failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session.' });
  }
};

module.exports = { verifyFirebaseAdmin };
