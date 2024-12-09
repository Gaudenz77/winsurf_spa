const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const { verifyToken } = require('../middleware/auth');

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Messages router is working' });
});

// Get direct messages with additional metadata
router.get('/direct/:targetUserId', verifyToken, async (req, res) => {
    console.log('Fetching direct messages for users:', req.user.userId, req.params.targetUserId);
    try {
        const currentUserId = req.user.userId;
        const targetUserId = parseInt(req.params.targetUserId);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        
        // First, try to get total message count
        const totalCount = await Message.countDirectMessages(currentUserId, targetUserId);
        console.log('Total message count:', totalCount);

        // If it's the first page and there are messages, try to get ALL messages
        let messages;
        let hasMore = false;
        if (page === 1 && totalCount > 0) {
            messages = await Message.getAllMessages(targetUserId, 'direct');
            hasMore = false;  // We've retrieved all messages
        } else {
            // Fallback to paginated retrieval
            messages = await Message.getDirectMessages(currentUserId, targetUserId, page, limit);
            hasMore = (page * limit) < totalCount;
        }
        
        console.log('Response details:', {
            messageCount: messages.length,
            totalCount,
            page,
            limit,
            hasMore
        });
        
        res.json({
            messages,
            totalCount,
            page,
            limit,
            hasMore
        });
    } catch (error) {
        console.error('Error fetching direct messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Get channel messages with additional metadata
router.get('/channel/:channelId', verifyToken, async (req, res) => {
    console.log('=== Channel Messages Request ===');
    console.log('User:', req.user);
    console.log('Channel ID:', req.params.channelId);
    
    try {
        const channelId = parseInt(req.params.channelId);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        
        // First, try to get total message count
        const totalCount = await Message.getTotalMessageCount(channelId, 'channel');
        console.log('Total message count:', totalCount);

        // If it's the first page and there are messages, try to get ALL messages
        let messages;
        let hasMore = false;
        if (page === 1 && totalCount > 0) {
            messages = await Message.getAllMessages(channelId, 'channel');
            hasMore = false;  // We've retrieved all messages
        } else {
            // Fallback to paginated retrieval
            messages = await Message.getChannelMessages(channelId, page, limit);
            hasMore = (page * limit) < totalCount;
        }
        
        console.log('Response details:', {
            messageCount: messages.length,
            totalCount,
            page,
            limit,
            hasMore
        });
        
        res.json({
            messages,
            totalCount,
            page,
            limit,
            hasMore
        });
    } catch (error) {
        console.error('Error details:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

// Add a reaction to a message
router.post('/:messageId/react', verifyToken, async (req, res) => {
    try {
        const messageId = parseInt(req.params.messageId);
        const userId = req.user.userId;
        const { reaction } = req.body;

        console.log('Adding reaction:', {
            messageId,
            userId,
            reaction
        });

        const result = await Message.addReaction(messageId, userId, reaction);
        
        res.json({
            success: true,
            reaction: result
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to add reaction' 
        });
    }
});

// Remove a reaction from a message
router.delete('/:messageId/react', verifyToken, async (req, res) => {
    try {
        const messageId = parseInt(req.params.messageId);
        const userId = req.user.userId;
        const { reaction } = req.body;

        console.log('Removing reaction:', {
            messageId,
            userId,
            reaction
        });

        const result = await Message.removeReaction(messageId, userId, reaction);
        
        res.json({
            success: true,
            reaction: result
        });
    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to remove reaction' 
        });
    }
});

module.exports = router;
