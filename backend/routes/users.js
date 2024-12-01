const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all users
router.get('/', async (req, res) => {
  try {
    console.log('Getting all users');
    const [users] = await pool.query(
      'SELECT id, username, email, created_at FROM users ORDER BY username'
    );
    console.log('Found users:', users);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    console.log('Getting current user');
    const [users] = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found current user:', users[0]);
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// Update current user
router.put('/me', async (req, res) => {
  try {
    console.log('Updating current user');
    const { username, email } = req.body;

    await pool.query(
      'UPDATE users SET username = ?, email = ? WHERE id = ?',
      [username, email, req.user.userId]
    );

    console.log('Updated user');
    const [updatedUser] = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    console.log('Found updated user:', updatedUser[0]);
    res.json({ user: updatedUser[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    console.log('Searching users');
    const { query } = req.query;
    
    if (!query) {
      console.log('Search query is required');
      return res.status(400).json({ message: 'Search query is required' });
    }

    const [users] = await pool.query(
      'SELECT id, username, email FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY username LIMIT 10',
      [`%${query}%`, `%${query}%`]
    );

    console.log('Found users:', users);
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Error searching users', error: error.message });
  }
});

module.exports = router;
