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

// Get messages with pagination
router.get('/messages/:targetId', verifyToken, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT m.*, u.username, u.profile_image 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.target_id = ?
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const [messages] = await Message.execute(query, [targetId, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [[{ total }]] = await Message.execute(
      'SELECT COUNT(*) as total FROM messages WHERE target_id = ?',
      [targetId]
    );

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
