const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const upload = require('../config/multer');
const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

// Apply auth middleware
router.use(verifyToken);

// Upload profile image
router.post('/upload-image', upload.single('profile_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get the relative path to store in database
    const relativePath = path.relative('public', req.file.path);

    // Delete old profile image if exists
    const [user] = await pool.query(
      'SELECT profile_image FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user[0]?.profile_image) {
      const oldImagePath = path.join('public', user[0].profile_image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user's profile_image in database
    await pool.query(
      'UPDATE users SET profile_image = ? WHERE id = ?',
      [relativePath, req.user.userId]
    );

    res.json({
      message: 'Profile image uploaded successfully',
      profile_image: relativePath
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ message: 'Error uploading profile image' });
  }
});

// Get profile image
router.get('/image', async (req, res) => {
  try {
    const [user] = await pool.query(
      'SELECT profile_image FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user[0]?.profile_image) {
      return res.status(404).json({ message: 'No profile image found' });
    }

    res.json({ profile_image: user[0].profile_image });
  } catch (error) {
    console.error('Get profile image error:', error);
    res.status(500).json({ message: 'Error getting profile image' });
  }
});

module.exports = router;
