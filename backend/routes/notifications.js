const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Get unread notifications
router.get('/unread', async (req, res) => {
    try {
        console.log('Fetching unread notifications for user:', req.user);
        
        const notificationService = req.app.get('notificationService');
        if (!notificationService) {
            console.error('Notification service not found on app object');
            return res.status(500).json({ message: 'Notification service not initialized' });
        }

        const result = await notificationService.getUnreadNotifications(req.user);
        console.log('Notifications fetched successfully:', result);
        res.json(result);
    } catch (error) {
        console.error('Get notifications error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error fetching notifications',
            error: error.message
        });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        console.log('Marking notification as read:', { id: req.params.id, user: req.user });
        const notificationService = req.app.get('notificationService');
        const result = await notificationService.markAsRead(req.params.id, req.user);
        console.log('Mark as read result:', result);
        res.json({ success: result });
    } catch (error) {
        console.error('Mark notification error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
    try {
        console.log('Marking all notifications as read for user:', req.user);
        const notificationService = req.app.get('notificationService');
        const result = await notificationService.markAllAsRead(req.user);
        console.log('Mark all as read result:', result);
        res.json({ success: true, count: result });
    } catch (error) {
        console.error('Mark all notifications error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
});

module.exports = router;
