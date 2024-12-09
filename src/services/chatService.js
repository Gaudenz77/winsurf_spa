import axios from 'axios';
import { API_URL } from '../config';

class ChatService {
    // Fetch direct messages between current user and target user
    static async getDirectMessages(targetUserId, page = 1, limit = 50) {
        try {
            const response = await axios.get(`${API_URL}/api/messages/direct/${targetUserId}`, {
                withCredentials: true,
                params: { page, limit }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching direct messages:', error);
            throw error;
        }
    }

    // Fetch channel messages
    static async getChannelMessages(channelId, page = 1, limit = 50) {
        try {
            const response = await axios.get(`${API_URL}/api/messages/channel/${channelId}`, {
                withCredentials: true,
                params: { page, limit }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching channel messages:', error);
            throw error;
        }
    }

    // Add a reaction to a message
    static async addMessageReaction(messageId, reaction) {
      try {
        const response = await axios.post(`${API_URL}/api/messages/${messageId}/react`, 
          { reaction }, 
          { withCredentials: true }
        );
        return response.data;
      } catch (error) {
        console.error('Error adding message reaction:', error);
        throw error;
      }
    }

    // Remove a reaction from a message
    static async removeMessageReaction(messageId, reaction) {
      try {
        const response = await axios.delete(`${API_URL}/api/messages/${messageId}/react`, { 
          data: { reaction },
          withCredentials: true
        });
        return response.data;
      } catch (error) {
        console.error('Error removing message reaction:', error);
        throw error;
      }
    }
}

export default ChatService;
