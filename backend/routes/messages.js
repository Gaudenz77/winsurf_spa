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
    try {
        const currentUserId = req.user.userId;
        const targetUserId = parseInt(req.params.targetUserId);

        // Validate targetUserId
        if (isNaN(targetUserId)) {
            return res.status(400).json({ message: 'Invalid target user ID' });
        }

        console.log(`Fetching direct messages for users: ${currentUserId}, Target: ${targetUserId}`);
        
        // Fetch all direct messages without pagination
        const messages = await Message.getAllMessages(targetUserId, 'direct');
        
        console.log('Message count:', messages.length);
        
        res.json({
            messages,
            totalCount: messages.length, // Total count of messages
        });
    } catch (error) {
        console.error('Error fetching direct messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

// Get channel messages with additional metadata
router.get('/channel/:channelId', verifyToken, async (req, res) => {
    try {
        const channelId = parseInt(req.params.channelId);

        // Validate channelId
        if (isNaN(channelId)) {
            return res.status(400).json({ message: 'Invalid channel ID' });
        }

        console.log('Fetching channel messages for Channel ID:', channelId);

        // Fetch all channel messages including reactions
        const messages = await Message.getAllMessages(channelId, 'channel');
        
        console.log('Message count:', messages.length);
        
        res.json({
            messages,
            totalCount: messages.length, // Total count of messages
        });
    } catch (error) {
        console.error('Error fetching channel messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

// Add a reaction to a message
router.post('/:messageId/react', verifyToken, async (req, res) => {
    try {
        const messageId = parseInt(req.params.messageId);
        const userId = req.user.userId;
        const { reaction } = req.body;

        // Validate reaction input
        if (!reaction) {
            return res.status(400).json({ message: 'Reaction type is required' });
        }

        console.log(`Adding reaction: Message ID: ${messageId}, User: ${userId}, Reaction: ${reaction}`);

        const result = await Message.addReaction(messageId, userId, reaction);
        
        res.json({
            success: true,
            reaction: result,
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

        // Validate reaction input
        if (!reaction) {
            return res.status(400).json({ message: 'Reaction type is required' });
        }

        console.log(`Removing reaction: Message ID: ${messageId}, User: ${userId}, Reaction: ${reaction}`);

        const result = await Message.removeReaction(messageId, userId, reaction);
        
        res.json({
            success: true,
            reaction: result,
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
