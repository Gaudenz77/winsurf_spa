const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get unread notifications
router.get('/unread', async (req, res) => {
    try {
        const notifications = await req.app.notificationService.getUnreadNotifications(req.user.userId);
        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        await req.app.notificationService.markAsRead(req.params.id, req.user.userId);
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
});

module.exports = router;
