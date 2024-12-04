import axios from 'axios';
import { API_URL } from '../config';

class ChatService {
    // Fetch direct messages between current user and target user
    static async getDirectMessages(targetUserId) {
        try {
            const response = await axios.get(`${API_URL}/api/messages/direct/${targetUserId}`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching direct messages:', error);
            throw error;
        }
    }

    // Fetch channel messages
    static async getChannelMessages(channelId) {
        try {
            const response = await axios.get(`${API_URL}/api/messages/channel/${channelId}`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching channel messages:', error);
            throw error;
        }
    }
}

export default ChatService;
