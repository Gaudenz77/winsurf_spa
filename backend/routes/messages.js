const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const { verifyToken } = require('../middleware/auth');

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Messages router is working' });
});

// Get direct messages between two users
router.get('/direct/:targetUserId', verifyToken, async (req, res) => {
    console.log('Fetching direct messages for users:', req.user.userId, req.params.targetUserId);
    try {
        const currentUserId = req.user.userId;
        const targetUserId = parseInt(req.params.targetUserId);
        const messages = await Message.getDirectMessages(currentUserId, targetUserId);
        console.log('Found direct messages with profile images:', messages.map(m => ({
            id: m.id,
            content: m.content,
            sender_username: m.sender_username,
            profile_image: m.profile_image
        })));
        res.json(messages);
    } catch (error) {
        console.error('Error fetching direct messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Get channel messages
router.get('/channel/:channelId', verifyToken, async (req, res) => {
    console.log('=== Channel Messages Request ===');
    console.log('User:', req.user);
    console.log('Channel ID:', req.params.channelId);
    
    try {
        const channelId = parseInt(req.params.channelId);
        console.log('Executing database query for channel:', channelId);
        
        const messages = await Message.getChannelMessages(channelId);
        console.log('Database query completed');
        console.log('Messages with profile images:', messages.map(m => ({
            id: m.id,
            content: m.content,
            sender_username: m.sender_username,
            profile_image: m.profile_image
        })));
        
        res.json(messages);
    } catch (error) {
        console.error('Error details:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

module.exports = router;
