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
}

export default ChatService;
