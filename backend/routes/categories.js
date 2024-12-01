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
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE created_by = ? OR created_by IS NULL ORDER BY name',
      [req.user.userId]
    );
    console.log('Found categories:', categories);
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
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

    res.status(201).json({ category: newCategory[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Error creating category' });
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

    res.json({ category: updatedCategory[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Error updating category' });
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
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

module.exports = router;
