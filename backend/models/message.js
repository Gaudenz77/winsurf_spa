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

    static async getChannelMessages(channelId, limit = 50) {
        try {
            console.log('Executing channel messages query with params:', { channelId, limit });
            const query = `
                SELECT m.*, u.username as sender_username, u.profile_image 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.target_id = ? AND m.message_type = 'channel' 
                ORDER BY m.created_at DESC 
                LIMIT ?
            `;
            console.log('Query:', query);
            console.log('Parameters:', [channelId, limit]);

            const [messages] = await db.query(query, [channelId, limit]);
            
            console.log('Raw messages from database:', messages);
            const reversedMessages = messages.reverse();
            console.log('Reversed messages:', reversedMessages);
            
            return reversedMessages;
        } catch (error) {
            console.error('Error in getChannelMessages:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    static async getDirectMessages(userId1, userId2, limit = 50) {
        try {
            console.log('Executing direct messages query with params:', { userId1, userId2, limit });
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
                LIMIT ?
            `;
            console.log('Query:', query);
            console.log('Parameters:', [userId1, userId2, userId2, userId1, limit]);

            const [messages] = await db.query(query, [userId1, userId2, userId2, userId1, limit]);
            
            console.log('Raw messages from database:', messages);
            const reversedMessages = messages.reverse();
            console.log('Reversed messages:', reversedMessages);
            
            return reversedMessages;
        } catch (error) {
            console.error('Error in getDirectMessages:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }
}

module.exports = Message;
