import axios from 'axios'

const API_URL = 'http://localhost:3000'

class NotificationService {
  async getUnreadNotifications() {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/unread`, {
        withCredentials: true
      })
      return response.data
    } catch (error) {
      console.error('Error fetching unread notifications:', error)
      throw error
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        withCredentials: true
      })
      return response.data
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  async markAllAsRead() {
    try {
      const response = await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        withCredentials: true
      })
      return response.data
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  async deleteNotification(notificationId) {
    try {
      const response = await axios.delete(`${API_URL}/api/notifications/${notificationId}`, {
        withCredentials: true
      })
      return response.data
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }
}

export default new NotificationService()
