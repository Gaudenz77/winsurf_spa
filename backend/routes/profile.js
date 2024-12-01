const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const upload = require('../config/multer');
const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Apply auth middleware
router.use(verifyToken);

// Update user profile
router.post('/update', upload.single('profile_image'), async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !email || !currentPassword) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    // Get current user data
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if username or email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, req.user.userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Handle profile image if uploaded
    let profile_image = user.profile_image;
    if (req.file) {
      // Delete old profile image if exists
      if (user.profile_image) {
        const oldImagePath = path.join('public', user.profile_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      profile_image = path.relative('public', req.file.path);
    }

    // Update user data
    const updates = {
      username,
      email,
      profile_image
    };

    // Hash new password if provided
    if (newPassword) {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    // Build dynamic update query
    const updateFields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const updateValues = [...Object.values(updates), req.user.userId];

    await pool.query(
      `UPDATE users SET ${updateFields} WHERE id = ?`,
      updateValues
    );

    // Get updated user data
    const [updatedUser] = await pool.query(
      'SELECT id, username, email, profile_image FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Remove profile image
router.post('/remove-image', async (req, res) => {
  try {
    // Get current user data
    const [users] = await pool.query(
      'SELECT profile_image FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Delete profile image if exists
    if (user.profile_image) {
      const imagePath = path.join('public', user.profile_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Update database
      await pool.query(
        'UPDATE users SET profile_image = NULL WHERE id = ?',
        [req.user.userId]
      );
    }

    res.json({
      message: 'Profile image removed successfully'
    });
  } catch (error) {
    console.error('Remove profile image error:', error);
    res.status(500).json({ message: 'Error removing profile image' });
  }
});

// Upload profile image (existing endpoint)
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

// Get profile image (existing endpoint)
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
