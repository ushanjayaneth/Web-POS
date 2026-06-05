const admin = require('firebase-admin');

const databaseURL = process.env.FIREBASE_DATABASE_URL
  || 'https://shop-lk-55dd1-default-rtdb.asia-southeast1.firebasedatabase.app/';

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  try {
    return require('../serviceAccountKey.json');
  } catch (err) {
    throw new Error(
      'Firebase service account is not configured. Set FIREBASE_SERVICE_ACCOUNT, '
      + 'FIREBASE_SERVICE_ACCOUNT_BASE64, or provide backend/serviceAccountKey.json locally.'
    );
  }
};

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
}

const db = admin.database();

module.exports = db;
module.exports.admin = admin;
