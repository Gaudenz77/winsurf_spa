const db = require('../db');

class Message {
    static async create(content, senderId, targetId, messageType) {
        try {
            console.log('Executing create message query with params:', { content, senderId, targetId, messageType });
            const query = `
                INSERT INTO messages (content, sender_id, target_id, message_type) VALUES (?, ?, ?, ?)
            `;
            console.log('Query:', query);
            console.log('Parameters:', [content, senderId, targetId, messageType]);

            const [result] = await db.query(query, [content, senderId, targetId, messageType]);
            
            console.log('Result from database:', result);
            
            return result.insertId;
        } catch (error) {
            console.error('Error in create:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    static async getChannelMessages(channelId, page = 1, limit = 50) {
        try {
            const offset = (page - 1) * limit;
            const query = `
                SELECT m.*, u.username as sender_username, u.profile_image 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.target_id = ? AND m.message_type = 'channel' 
                ORDER BY m.created_at DESC 
                LIMIT ? OFFSET ?
            `;

            const [messages] = await db.query(query, [channelId, limit, offset]);
            
            console.log('Raw messages from database:', messages);
            return messages.reverse();
        } catch (error) {
            console.error('Error in getChannelMessages:', error);
            throw error;
        }
    }

    static async countChannelMessages(channelId) {
        try {
            const query = `
                SELECT COUNT(*) as total 
                FROM messages 
                WHERE target_id = ? AND message_type = 'channel'
            `;

            const [result] = await db.query(query, [channelId]);
            return result[0].total;
        } catch (error) {
            console.error('Error in countChannelMessages:', error);
            throw error;
        }
    }

    static async getDirectMessages(userId1, userId2, page = 1, limit = 50) {
        try {
            const offset = (page - 1) * limit;
            const query = `
                SELECT m.*, u.username as sender_username, u.profile_image 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.message_type = 'direct' 
                AND (
                    (m.sender_id = ? AND m.target_id = ?) 
                    OR 
                    (m.sender_id = ? AND m.target_id = ?)
                ) 
                ORDER BY m.created_at DESC 
                LIMIT ? OFFSET ?
            `;

            const [messages] = await db.query(query, [userId1, userId2, userId2, userId1, limit, offset]);
            
            console.log('Raw messages from database:', messages);
            return messages.reverse();
        } catch (error) {
            console.error('Error in getDirectMessages:', error);
            throw error;
        }
    }

    static async countDirectMessages(userId1, userId2) {
        try {
            const query = `
                SELECT COUNT(*) as total 
                FROM messages 
                WHERE message_type = 'direct' 
                AND (
                    (sender_id = ? AND target_id = ?) 
                    OR 
                    (sender_id = ? AND target_id = ?)
                )
            `;

            const [result] = await db.query(query, [userId1, userId2, userId2, userId1]);
            return result[0].total;
        } catch (error) {
            console.error('Error in countDirectMessages:', error);
            throw error;
        }
    }
}

module.exports = Message;
