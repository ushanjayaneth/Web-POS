const express = require('express');
const router = express.Router();

// Uploads are disabled for Serverless / Firebase migration.
// Use Firebase Storage directly from the frontend.
router.post('/', (req, res) => {
  res.status(400).json({ success: false, message: 'Local image upload is disabled. Please provide an image URL.' });
});

module.exports = router;
