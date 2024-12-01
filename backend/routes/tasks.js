const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all tasks for current user (either created by or assigned to)
router.get('/', async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.created_by = ? OR t.assigned_to = ? 
       ORDER BY t.created_at DESC`,
      [req.user.userId, req.user.userId]
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
    console.log('Received task creation request:', req.body);
    console.log('User:', req.user);

    const { 
      title, 
      description, 
      priority,
      status,
      category_id,
      due_date,
      assigned_to,
      reminder_date 
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Format dates to MySQL datetime format
    const formatDate = (dateString) => {
      if (!dateString) return null;
      return new Date(dateString).toISOString().slice(0, 19).replace('T', ' ');
    };

    const formattedDueDate = formatDate(due_date);
    const formattedReminderDate = formatDate(reminder_date);

    console.log('Inserting task with values:', {
      userId: req.user.userId,
      title,
      description,
      priority,
      status,
      category_id,
      due_date: formattedDueDate,
      assigned_to,
      reminder_date: formattedReminderDate
    });

    const [result] = await pool.query(
      `INSERT INTO tasks (
        created_by, 
        title, 
        description, 
        priority,
        status,
        category_id,
        due_date,
        assigned_to,
        reminder_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        title,
        description,
        priority || 'medium',
        status || 'pending',
        category_id || null,
        formattedDueDate,
        assigned_to || null,
        formattedReminderDate
      ]
    );

    console.log('Task inserted, getting new task details...');

    const [newTask] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
      [result.insertId]
    );

    console.log('New task retrieved:', newTask[0]);
    res.status(201).json({ task: newTask[0] });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority,
      status,
      category_id,
      due_date,
      assigned_to,
      reminder_date 
    } = req.body;
    const taskId = req.params.id;

    // Verify task belongs to user
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND (created_by = ? OR assigned_to = ?)',
      [taskId, req.user.userId, req.user.userId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await pool.query(
      `UPDATE tasks SET 
        title = ?, 
        description = ?, 
        priority = ?,
        status = ?,
        category_id = ?,
        due_date = ?,
        assigned_to = ?,
        reminder_date = ?
       WHERE id = ?`,
      [
        title,
        description,
        priority,
        status,
        category_id,
        due_date,
        assigned_to,
        reminder_date,
        taskId
      ]
    );

    const [updatedTask] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
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
      'SELECT * FROM tasks WHERE id = ? AND created_by = ?',
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

// Get tasks by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.category_id = ? AND (t.created_by = ? OR t.assigned_to = ?)
       ORDER BY t.created_at DESC`,
      [req.params.categoryId, req.user.userId, req.user.userId]
    );
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks by category error:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Get tasks assigned to user
router.get('/assigned/:userId', async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.assigned_to = ?
       ORDER BY t.created_at DESC`,
      [req.params.userId]
    );
    res.json({ tasks });
  } catch (error) {
    console.error('Get assigned tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Get overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.due_date < NOW() 
       AND t.status NOT IN ('completed', 'archived')
       AND (t.created_by = ? OR t.assigned_to = ?)
       ORDER BY t.due_date ASC`,
      [req.user.userId, req.user.userId]
    );
    res.json({ tasks });
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

module.exports = router;
