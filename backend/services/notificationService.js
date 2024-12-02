const pool = require('../config/database');

class NotificationService {
    constructor(wsServer) {
        this.wsServer = wsServer;
    }

    async createNotification(userId, taskId, type, message) {
        try {
            const [result] = await pool.query(
                'INSERT INTO notifications (user_id, task_id, type, message) VALUES (?, ?, ?, ?)',
                [userId, taskId, type, message]
            );

            const [notification] = await pool.query(
                'SELECT * FROM notifications WHERE id = ?',
                [result.insertId]
            );

            // Send real-time notification via WebSocket
            if (notification[0]) {
                this.wsServer.sendNotification(userId, notification[0]);
            }

            return notification[0];
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async getUnreadNotifications(userId) {
        try {
            const [notifications] = await pool.query(
                `SELECT n.*, t.title as task_title 
                 FROM notifications n 
                 LEFT JOIN tasks t ON n.task_id = t.id 
                 WHERE n.user_id = ? AND n.is_read = FALSE 
                 ORDER BY n.created_at DESC`,
                [userId]
            );
            return notifications;
        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            await pool.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [notificationId, userId]
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async notifyTaskAssignment(taskId, assignedToId, assignedByUserId) {
        const message = `You have been assigned a new task`;
        return this.createNotification(assignedToId, taskId, 'task_assigned', message);
    }

    async notifyTaskUpdate(taskId, userId, updateType) {
        const message = `Task has been ${updateType}`;
        return this.createNotification(userId, taskId, 'task_updated', message);
    }

    async notifyDueSoon(taskId, userId) {
        const message = `Task is due soon`;
        return this.createNotification(userId, taskId, 'due_soon', message);
    }

    async notifyReminder(taskId, userId) {
        const message = `Reminder for your task`;
        return this.createNotification(userId, taskId, 'reminder', message);
    }
}

module.exports = NotificationService;
