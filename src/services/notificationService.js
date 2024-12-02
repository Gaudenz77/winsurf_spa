import axios from 'axios'
import { API_URL } from '../config'

const notificationService = {
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
  },

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
  },

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
}

export default notificationService
