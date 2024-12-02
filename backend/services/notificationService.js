const pool = require('../config/database');

class NotificationService {
    constructor(wsServer) {
        console.log('NotificationService initialized with WebSocket server:', !!wsServer);
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
            console.log('NotificationService: Creating notification:', { userId, taskId, type, message });
            
            if (!userId || !taskId || !type || !message) {
                console.error('NotificationService: Missing required parameters for creating notification');
                throw new Error('Missing required parameters');
            }

            const [result] = await pool.query(
                'INSERT INTO notifications (user_id, task_id, type, message, is_read, created_at) VALUES (?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)',
                [userId, taskId, type, message]
            );

            console.log('NotificationService: Notification created with ID:', result.insertId);

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
                
                console.log('NotificationService: Sending notification via WebSocket:', enrichedNotification);
                this.wsServer.sendNotification(userId, enrichedNotification);
            } else {
                console.log('NotificationService: WebSocket server not available or notification not found');
            }

            return notification[0];
        } catch (error) {
            console.error('NotificationService Error:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async getUnreadNotifications(userId) {
        try {
            console.log('NotificationService: Getting unread notifications for user:', userId);
            
            if (!userId) {
                console.error('NotificationService: No userId provided');
                throw new Error('User ID is required');
            }

            // First check if user exists
            const [users] = await pool.query(
                'SELECT id FROM users WHERE id = ?',
                [userId]
            );

            if (!users || users.length === 0) {
                console.error('NotificationService: User not found:', userId);
                throw new Error('User not found');
            }

            const [notifications] = await pool.query(
                `SELECT n.*, t.title as task_title, t.status as task_status, t.priority as task_priority 
                 FROM notifications n 
                 LEFT JOIN tasks t ON n.task_id = t.id 
                 WHERE n.user_id = ? AND n.is_read = FALSE 
                 ORDER BY n.created_at DESC`,
                [userId]
            );
            
            console.log('NotificationService: Found notifications:', notifications.length);
            
            const enrichedNotifications = notifications.map(notification => ({
                ...notification,
                created_at: new Date(notification.created_at).toISOString(),
                type_display: this.getNotificationTypeDisplay(notification.type)
            }));

            return { notifications: enrichedNotifications };
        } catch (error) {
            console.error('NotificationService Error:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            console.log('NotificationService: Marking notification as read:', { notificationId, userId });
            const [result] = await pool.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [notificationId, userId]
            );
            console.log('NotificationService: Mark as read result:', result);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('NotificationService: Error marking as read:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async markAllAsRead(userId) {
        try {
            console.log('NotificationService: Marking all notifications as read for user:', userId);
            const [result] = await pool.query(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
                [userId]
            );
            console.log('NotificationService: Mark all as read result:', result);
            return result.affectedRows;
        } catch (error) {
            console.error('NotificationService: Error marking all as read:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async deleteOldNotifications(daysOld = 30) {
        try {
            console.log('NotificationService: Deleting old notifications:', daysOld);
            const [result] = await pool.query(
                'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [daysOld]
            );
            console.log('NotificationService: Delete old notifications result:', result);
            return result.affectedRows;
        } catch (error) {
            console.error('NotificationService: Error deleting old notifications:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    getNotificationTypeDisplay(type) {
        const displays = {
            task_assigned: 'Task Assignment',
            task_status_changed: 'Status Update',
            task_due_date_changed: 'Due Date Update',
            task_priority_changed: 'Priority Update',
            task_completed: 'Task Completed',
            task_reminder: 'Task Reminder'
        };
        return displays[type] || type;
    }
}

module.exports = NotificationService;
