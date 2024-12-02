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

    const formatDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const formattedDueDate = formatDate(due_date);
    const formattedReminderDate = formatDate(reminder_date);
    const assignedToValue = assigned_to === '' ? null : assigned_to;

    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, priority, status, category_id, due_date, assigned_to, reminder_date, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [title, description, priority, status, category_id, formattedDueDate, assignedToValue, formattedReminderDate, req.user.userId]
    );

    // Create notification if task is assigned to someone
    if (assignedToValue && assignedToValue !== req.user.userId) {
      const notificationService = req.app.get('notificationService');
      await notificationService.createNotification(
        assignedToValue,
        result.insertId,
        'TASK_ASSIGNED',
        `New task assigned to you: "${title}". Priority: ${priority}`
      );
    }

    const [task] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ task: task[0] });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error creating task' });
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

    // Get current task data
    const [currentTask] = await pool.query(
      'SELECT * FROM tasks WHERE id = ?',
      [req.params.id]
    );

    if (!currentTask[0]) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const formatDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const formattedDueDate = formatDate(due_date);
    const formattedReminderDate = formatDate(reminder_date);
    const assignedToValue = assigned_to === '' ? null : assigned_to;

    await pool.query(
      `UPDATE tasks 
       SET title = ?, description = ?, priority = ?, status = ?, 
           category_id = ?, due_date = ?, assigned_to = ?, reminder_date = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [title, description, priority, status, category_id, formattedDueDate, 
       assignedToValue, formattedReminderDate, req.params.id]
    );

    // Create notifications for relevant changes
    const notificationService = req.app.get('notificationService');

    // Notification for assignment change
    if (assignedToValue && assignedToValue !== currentTask[0].assigned_to) {
      await notificationService.createNotification(
        assignedToValue,
        req.params.id,
        'TASK_ASSIGNED',
        `New task assigned to you: "${title}". Priority: ${priority}`
      );
    }

    // Notification for status change
    if (status !== currentTask[0].status && currentTask[0].assigned_to) {
      await notificationService.createNotification(
        currentTask[0].assigned_to,
        req.params.id,
        'TASK_STATUS_CHANGED',
        `Task "${title}" status has been changed from "${currentTask[0].status}" to "${status}"`
      );
    }

    // Notification for due date change
    if (formattedDueDate !== currentTask[0].due_date && currentTask[0].assigned_to) {
      const newDate = new Date(formattedDueDate).toLocaleDateString();
      await notificationService.createNotification(
        currentTask[0].assigned_to,
        req.params.id,
        'TASK_DUE_DATE_CHANGED',
        `Due date for task "${title}" has been updated to ${newDate}`
      );
    }

    // Notification for priority change
    if (priority !== currentTask[0].priority && currentTask[0].assigned_to) {
      await notificationService.createNotification(
        currentTask[0].assigned_to,
        req.params.id,
        'TASK_PRIORITY_CHANGED',
        `Priority for task "${title}" has been changed from "${currentTask[0].priority}" to "${priority}"`
      );
    }

    const [updatedTask] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
      [req.params.id]
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
