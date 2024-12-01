const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all tasks for current user
router.get('/', async (req, res) => {
  try {
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, description, priority) VALUES (?, ?, ?, ?)',
      [req.user.userId, title, description, priority || 'medium']
    );

    const [newTask] = await pool.query(
      'SELECT * FROM tasks WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ task: newTask[0] });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, priority, completed } = req.body;
    const taskId = req.params.id;

    // Verify task belongs to user
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.userId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, priority = ?, completed = ? WHERE id = ?',
      [title, description, priority, completed, taskId]
    );

    const [updatedTask] = await pool.query(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    res.json({ task: updatedTask[0] });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    // Verify task belongs to user
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.userId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Error deleting task' });
  }
});

module.exports = router;
