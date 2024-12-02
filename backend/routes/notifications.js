const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Get unread notifications
router.get('/unread', async (req, res) => {
    try {
        const result = await req.app.notificationService.getUnreadNotifications(req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const result = await req.app.notificationService.markAsRead(req.params.id, req.user.userId);
        res.json({ success: result });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
    try {
        const result = await req.app.notificationService.markAllAsRead(req.user.userId);
        res.json({ success: true, count: result });
    } catch (error) {
        console.error('Mark all notifications error:', error);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
});

module.exports = router;
