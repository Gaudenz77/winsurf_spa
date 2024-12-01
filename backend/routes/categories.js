const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all categories
router.get('/', async (req, res) => {
  try {
    console.log('Getting categories for user:', req.user.userId);
    
    // Modified query to show all system categories (created_by IS NULL) and user's custom categories
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE created_by IS NULL OR created_by = ? ORDER BY name',
      [req.user.userId]
    );
    
    console.log('Found categories:', categories);
    console.log('SQL Query:', 'SELECT * FROM categories WHERE created_by IS NULL OR created_by = ? ORDER BY name');
    console.log('Query parameters:', [req.user.userId]);
    
    // Send categories in response
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create new category
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, color, created_by) VALUES (?, ?, ?)',
      [name, color || '#808080', req.user.userId]
    );

    const [newCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    console.log('Created new category:', newCategory[0]);
    console.log('SQL Query:', 'INSERT INTO categories (name, color, created_by) VALUES (?, ?, ?)');
    console.log('Query parameters:', [name, color || '#808080', req.user.userId]);

    res.status(201).json({ category: newCategory[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const categoryId = req.params.id;

    // Verify category belongs to user
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND created_by = ?',
      [categoryId, req.user.userId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, color = ? WHERE id = ?',
      [name, color, categoryId]
    );

    const [updatedCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );

    console.log('Updated category:', updatedCategory[0]);
    console.log('SQL Query:', 'UPDATE categories SET name = ?, color = ? WHERE id = ?');
    console.log('Query parameters:', [name, color, categoryId]);

    res.json({ category: updatedCategory[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Verify category belongs to user
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND created_by = ?',
      [categoryId, req.user.userId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Set category_id to NULL for all tasks in this category
    await pool.query(
      'UPDATE tasks SET category_id = NULL WHERE category_id = ?',
      [categoryId]
    );

    await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);

    console.log('Deleted category:', categoryId);
    console.log('SQL Query:', 'DELETE FROM categories WHERE id = ?');
    console.log('Query parameters:', [categoryId]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

module.exports = router;
