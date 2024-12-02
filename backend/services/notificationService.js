const pool = require('../config/database');

class NotificationService {
    constructor(wsServer) {
        this.wsServer = wsServer;
        this.notificationTypes = {
            TASK_ASSIGNED: 'task_assigned',
            TASK_STATUS_CHANGED: 'task_status_changed',
            TASK_DUE_DATE_CHANGED: 'task_due_date_changed',
            TASK_PRIORITY_CHANGED: 'task_priority_changed',
            TASK_COMPLETED: 'task_completed',
            TASK_REMINDER: 'task_reminder'
        };
    }

    async createNotification(userId, taskId, type, message) {
        try {
            console.log('Creating notification:', { userId, taskId, type, message });
            
            const [result] = await pool.query(
                'INSERT INTO notifications (user_id, task_id, type, message, is_read, created_at) VALUES (?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)',
                [userId, taskId, type, message]
            );

            console.log('Notification created with ID:', result.insertId);

            const [notification] = await pool.query(
                `SELECT n.*, t.title as task_title, t.status as task_status, t.priority as task_priority 
                 FROM notifications n 
                 LEFT JOIN tasks t ON n.task_id = t.id 
                 WHERE n.id = ?`,
                [result.insertId]
            );

            if (this.wsServer && notification[0]) {
                const enrichedNotification = {
                    ...notification[0],
                    created_at: new Date(notification[0].created_at).toISOString(),
                    type_display: this.getNotificationTypeDisplay(notification[0].type)
                };
                
                console.log('Sending notification via WebSocket:', enrichedNotification);
                this.wsServer.sendNotification(userId, enrichedNotification);
            } else {
                console.log('WebSocket server not available or notification not found');
            }

            return notification[0];
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    getNotificationTypeDisplay(type) {
        const displays = {
            TASK_ASSIGNED: 'Task Assignment',
            TASK_STATUS_CHANGED: 'Status Update',
            TASK_DUE_DATE_CHANGED: 'Due Date Update',
            TASK_PRIORITY_CHANGED: 'Priority Update',
            TASK_COMPLETED: 'Task Completed',
            TASK_REMINDER: 'Task Reminder'
        };
        return displays[type] || type;
    }

    async getUnreadNotifications(userId) {
        try {
            console.log('Fetching unread notifications for user:', userId);
            const [notifications] = await pool.query(
                `SELECT n.*, t.title as task_title, t.status as task_status, t.priority as task_priority 
                 FROM notifications n 
                 LEFT JOIN tasks t ON n.task_id = t.id 
                 WHERE n.user_id = ? AND n.is_read = FALSE 
                 ORDER BY n.created_at DESC`,
                [userId]
            );
            
            console.log('Found notifications:', notifications);
            
            const enrichedNotifications = notifications.map(notification => ({
                ...notification,
                created_at: new Date(notification.created_at).toISOString(),
                type_display: this.getNotificationTypeDisplay(notification.type)
            }));

            console.log('Enriched notifications:', enrichedNotifications);
            return { notifications: enrichedNotifications };
        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            const [result] = await pool.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [notificationId, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async markAllAsRead(userId) {
        try {
            const [result] = await pool.query(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
                [userId]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    async deleteOldNotifications(daysOld = 30) {
        try {
            const [result] = await pool.query(
                'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [daysOld]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting old notifications:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;
