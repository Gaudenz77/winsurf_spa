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
            console.log('Retrieving channel messages:', {
                channelId,
                page,
                limit,
                offset
            });

            const query = `
                SELECT m.*, u.username as sender_username, u.profile_image 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.target_id = ? AND m.message_type = 'channel' 
                ORDER BY m.created_at ASC 
                LIMIT ? OFFSET ?
            `;

            const [messages] = await db.query(query, [channelId, limit, offset]);
            
            // Get reactions for these messages
            if (messages.length > 0) {
                const messageIds = messages.map(m => m.id);
                const reactions = await this.getMessageReactions(messageIds);
                
                // Attach reactions to messages
                messages.forEach(message => {
                    message.reactions = reactions[message.id] || {};
                });
            }

            console.log('Retrieved channel messages:', {
                messageCount: messages.length,
                firstMessage: messages.length > 0 ? messages[0].created_at : null,
                lastMessage: messages.length > 0 ? messages[messages.length - 1].created_at : null
            });

            return messages;
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
            console.log('Retrieving direct messages:', {
                userId1,
                userId2,
                page,
                limit,
                offset
            });

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
                ORDER BY m.created_at ASC 
                LIMIT ? OFFSET ?
            `;

            const [messages] = await db.query(query, [userId1, userId2, userId2, userId1, limit, offset]);
            
            // Get reactions for these messages
            if (messages.length > 0) {
                const messageIds = messages.map(m => m.id);
                const reactions = await this.getMessageReactions(messageIds);
                
                // Attach reactions to messages
                messages.forEach(message => {
                    message.reactions = reactions[message.id] || {};
                });
            }

            console.log('Retrieved direct messages:', {
                messageCount: messages.length,
                firstMessage: messages.length > 0 ? messages[0].created_at : null,
                lastMessage: messages.length > 0 ? messages[messages.length - 1].created_at : null
            });

            return messages;
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

    static async getEarliestMessageTimestamp(targetId, messageType) {
        try {
            const query = `
                SELECT MIN(created_at) as earliest_timestamp 
                FROM messages 
                WHERE target_id = ? AND message_type = ?
            `;

            const [result] = await db.query(query, [targetId, messageType]);
            
            return result[0].earliest_timestamp;
        } catch (error) {
            console.error('Error in getEarliestMessageTimestamp:', error);
            throw error;
        }
    }

    static async hasMoreMessagesBefore(targetId, messageType, beforeTimestamp) {
        try {
            const query = `
                SELECT COUNT(*) as count 
                FROM messages 
                WHERE target_id = ? 
                AND message_type = ? 
                AND created_at < ?
            `;

            const [result] = await db.query(query, [targetId, messageType, beforeTimestamp]);
            
            return result[0].count > 0;
        } catch (error) {
            console.error('Error in hasMoreMessagesBefore:', error);
            throw error;
        }
    }

    static async getTotalMessageCount(targetId, messageType) {
        try {
            const query = `
                SELECT COUNT(*) as total 
                FROM messages 
                WHERE target_id = ? AND message_type = ?
            `;

            const [result] = await db.query(query, [targetId, messageType]);
            
            console.log('Total message count:', {
                targetId,
                messageType,
                total: result[0].total
            });

            return result[0].total;
        } catch (error) {
            console.error('Error in getTotalMessageCount:', error);
            throw error;
        }
    }

    static async getAllMessages(targetId, messageType) {
        try {
            console.log('Retrieving ALL messages:', {
                targetId,
                messageType
            });

            const query = `
                SELECT m.*, u.username as sender_username, u.profile_image 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.target_id = ? AND m.message_type = ?
                ORDER BY m.created_at ASC
            `;

            const [messages] = await db.query(query, [targetId, messageType]);
            
            console.log('Retrieved ALL messages:', {
                messageCount: messages.length,
                firstMessage: messages.length > 0 ? messages[0].created_at : null,
                lastMessage: messages.length > 0 ? messages[messages.length - 1].created_at : null
            });

            return messages;
        } catch (error) {
            console.error('Error in getAllMessages:', error);
            throw error;
        }
    }

    static async addReaction(messageId, userId, reaction) {
        try {
            // Validate reaction
            const validReactions = [
                'thumbs_up', 'thumbs_down', 
                'heart', 'laugh', 'sad', 
                'wow', 'angry', 'celebrate'
            ];
            
            if (!validReactions.includes(reaction)) {
                throw new Error('Invalid reaction');
            }

            const query = `
                INSERT INTO message_reactions 
                (message_id, user_id, reaction) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE reaction = ?
            `;

            const [result] = await db.query(query, [messageId, userId, reaction, reaction]);
            
            return {
                messageId,
                userId,
                reaction,
                success: result.affectedRows > 0
            };
        } catch (error) {
            console.error('Error adding reaction:', error);
            throw error;
        }
    }

    static async removeReaction(messageId, userId, reaction) {
        try {
            const query = `
                DELETE FROM message_reactions 
                WHERE message_id = ? 
                AND user_id = ? 
                AND reaction = ?
            `;

            const [result] = await db.query(query, [messageId, userId, reaction]);
            
            return {
                messageId,
                userId,
                reaction,
                success: result.affectedRows > 0
            };
        } catch (error) {
            console.error('Error removing reaction:', error);
            throw error;
        }
    }

    static async getMessageReactions(messageIds) {
        try {
            if (!messageIds || messageIds.length === 0) {
                return {};
            }

            const placeholders = messageIds.map(() => '?').join(',');
            const query = `
                SELECT 
                    message_id, 
                    reaction, 
                    COUNT(*) as count,
                    JSON_ARRAYAGG(user_id) as user_ids
                FROM message_reactions 
                WHERE message_id IN (${placeholders})
                GROUP BY message_id, reaction
            `;

            const [reactions] = await db.query(query, messageIds);
            
            // Transform reactions into a more usable format
            const reactionMap = {};
            reactions.forEach(reaction => {
                if (!reactionMap[reaction.message_id]) {
                    reactionMap[reaction.message_id] = {};
                }
                reactionMap[reaction.message_id][reaction.reaction] = {
                    count: reaction.count,
                    userIds: JSON.parse(reaction.user_ids)
                };
            });

            return reactionMap;
        } catch (error) {
            console.error('Error getting message reactions:', error);
            throw error;
        }
    }
}

module.exports = Message;
