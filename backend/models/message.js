const db = require('../db');

class Message {
    static async create(content, senderId, targetId, messageType) {
        try {
            const [result] = await db.query(
                'INSERT INTO messages (content, sender_id, target_id, message_type) VALUES (?, ?, ?, ?)',
                [content, senderId, targetId, messageType]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating message:', error);
            throw error;
        }
    }

    static async getChannelMessages(channelId, limit = 50) {
        try {
            const [messages] = await db.query(
                `SELECT m.*, u.username as sender_username 
                 FROM messages m 
                 JOIN users u ON m.sender_id = u.id 
                 WHERE m.target_id = ? AND m.message_type = 'channel' 
                 ORDER BY m.created_at DESC 
                 LIMIT ?`,
                [channelId, limit]
            );
            return messages.reverse(); // Return in chronological order
        } catch (error) {
            console.error('Error getting channel messages:', error);
            throw error;
        }
    }

    static async getDirectMessages(userId1, userId2, limit = 50) {
        try {
            const [messages] = await db.query(
                `SELECT m.*, u.username as sender_username 
                 FROM messages m 
                 JOIN users u ON m.sender_id = u.id 
                 WHERE m.message_type = 'direct' 
                 AND ((m.sender_id = ? AND m.target_id = ?) 
                 OR (m.sender_id = ? AND m.target_id = ?))
                 ORDER BY m.created_at DESC 
                 LIMIT ?`,
                [userId1, userId2, userId2, userId1, limit]
            );
            return messages.reverse(); // Return in chronological order
        } catch (error) {
            console.error('Error getting direct messages:', error);
            throw error;
        }
    }
}

module.exports = Message;
