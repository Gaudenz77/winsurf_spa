const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

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

    console.log('Received task data:', req.body);

    // Format dates to MySQL datetime format
    const formatDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const formattedDueDate = formatDate(due_date);
    const formattedReminderDate = formatDate(reminder_date);

    // Convert empty string to null for assigned_to
    const assignedToValue = assigned_to === '' ? null : assigned_to;

    console.log('Formatted dates:', {
      original_due_date: due_date,
      formatted_due_date: formattedDueDate,
      original_reminder_date: reminder_date,
      formatted_reminder_date: formattedReminderDate
    });

    const [result] = await pool.query(
      `INSERT INTO tasks (
        title, 
        description, 
        priority,
        status,
        category_id,
        due_date,
        created_by,
        assigned_to,
        reminder_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        title,
        description,
        priority,
        status || 'pending',
        category_id,
        formattedDueDate,
        req.user.userId,
        assignedToValue,
        formattedReminderDate
      ]
    );

    // Create notification for assigned user if different from creator
    if (assignedToValue && assignedToValue !== req.user.userId && req.app.get('notificationService')) {
      const notificationService = req.app.get('notificationService');
      await notificationService.createNotification(
        assignedToValue,
        result.insertId,
        'TASK_ASSIGNED',
        `You have been assigned a new task: ${title}`
      );
    }

    // Fetch the created task with category and user information
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
    console.log('Updating task with data:', req.body);
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

    // Get current task data
    const [currentTask] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND (created_by = ? OR assigned_to = ?)',
      [taskId, req.user.userId, req.user.userId]
    );

    if (currentTask.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Format dates to MySQL datetime format
    const formatDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const formattedDueDate = formatDate(due_date);
    const formattedReminderDate = formatDate(reminder_date);

    console.log('Formatted dates:', {
      original_due_date: due_date,
      formatted_due_date: formattedDueDate,
      original_reminder_date: reminder_date,
      formatted_reminder_date: formattedReminderDate
    });

    await pool.query(
      `UPDATE tasks SET 
        title = ?, 
        description = ?, 
        priority = ?,
        status = ?,
        category_id = ?,
        due_date = ?,
        assigned_to = ?,
        reminder_date = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title,
        description,
        priority,
        status,
        category_id,
        formattedDueDate,
        assigned_to,
        formattedReminderDate,
        taskId
      ]
    );

    // Fetch updated task with category and user information
    const [updatedTask] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username as assigned_username 
       FROM tasks t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
      [taskId]
    );

    // Send notifications based on changes
    if (assigned_to && assigned_to !== currentTask[0].assigned_to && req.app.get('notificationService')) {
      const notificationService = req.app.get('notificationService');
      // New assignment notification
      await notificationService.createNotification(
        assigned_to,
        taskId,
        'TASK_ASSIGNED',
        `You have been assigned a new task: ${title}`
      );
    }

    if (status !== currentTask[0].status) {
      // Status change notification
      if (currentTask[0].assigned_to) {
        const notificationService = req.app.get('notificationService');
        await notificationService.createNotification(
          currentTask[0].assigned_to,
          taskId,
          'TASK_UPDATED',
          `status changed to ${status}`
        );
      }
    }

    if (priority !== currentTask[0].priority) {
      // Priority change notification
      if (currentTask[0].assigned_to) {
        const notificationService = req.app.get('notificationService');
        await notificationService.createNotification(
          currentTask[0].assigned_to,
          taskId,
          'TASK_UPDATED',
          `priority changed to ${priority}`
        );
      }
    }

    console.log('Task updated successfully:', updatedTask[0]);
    res.json({ task: updatedTask[0] });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
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
