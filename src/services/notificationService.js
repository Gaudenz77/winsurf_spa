import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const API_URL = 'http://localhost:3000'

class NotificationService {
  async getUnreadNotifications() {
    try {
      console.log('NotificationService: Fetching unread notifications');
      const authStore = useAuthStore();
      
      if (!authStore.isAuthenticated) {
        console.error('NotificationService: User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('NotificationService: User authenticated, proceeding with request');
      const response = await axios.get(`${API_URL}/api/notifications/unread`, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      console.log('NotificationService: Received response:', response.data);
      return response.data;
    } catch (error) {
      console.error('NotificationService: Error fetching unread notifications:', error.response?.data || error);
      throw error;
    }
  }

  async markAsRead(notificationId) {
    try {
      console.log('NotificationService: Marking notification as read:', notificationId);
      const authStore = useAuthStore();
      
      const response = await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      console.log('NotificationService: Mark as read response:', response.data);
      return response.data;
    } catch (error) {
      console.error('NotificationService: Error marking notification as read:', error.response?.data || error);
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      console.log('NotificationService: Marking all notifications as read');
      const authStore = useAuthStore();
      
      const response = await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      console.log('NotificationService: Mark all as read response:', response.data);
      return response.data;
    } catch (error) {
      console.error('NotificationService: Error marking all notifications as read:', error.response?.data || error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      console.log('NotificationService: Deleting notification:', notificationId);
      const authStore = useAuthStore();
      
      const response = await axios.delete(`${API_URL}/api/notifications/${notificationId}`, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      console.log('NotificationService: Delete response:', response.data);
      return response.data;
    } catch (error) {
      console.error('NotificationService: Error deleting notification:', error.response?.data || error);
      throw error;
    }
  }
}

export default new NotificationService()
