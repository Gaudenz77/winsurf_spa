import axios from 'axios'

const API_URL = 'http://localhost:3000'

class UserService {
  async getUsers() {
    try {
      console.log('Fetching users from:', `${API_URL}/api/users`)
      const response = await axios.get(`${API_URL}/api/users`, {
        withCredentials: true
      })
      console.log('Users response:', response.data)
      return response.data.users || []
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error)
      return [] // Return empty array instead of throwing
    }
  }

  async getCurrentUser() {
    try {
      const response = await axios.get(`${API_URL}/api/users/me`, {
        withCredentials: true
      })
      return response.data.user
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  }

  async updateUser(userData) {
    try {
      const response = await axios.put(`${API_URL}/api/users/me`, userData, {
        withCredentials: true
      })
      return response.data.user
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  async searchUsers(query) {
    try {
      const response = await axios.get(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        withCredentials: true
      })
      return response.data.users
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }
}

export const userService = new UserService()
