import { ref } from 'vue'
import { authService } from './authService'

class SessionService {
  constructor() {
    this.currentUser = ref(null)
  }

  // Create a session
  async createSession(userData) {
    this.currentUser.value = userData.user || userData
    return userData
  }

  // Update session with new user data
  updateSession(userData) {
    this.currentUser.value = userData
    return userData
  }

  // Get current session
  async getSession() {
    if (!this.currentUser.value) {
      try {
        const userData = await authService.getCurrentUser()
        if (userData) {
          this.currentUser.value = userData
        }
      } catch (error) {
        console.error('Error getting current user:', error)
        return null
      }
    }
    return this.currentUser.value
  }

  // Clear session
  clearSession() {
    this.currentUser.value = null
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser.value
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser.value
  }
}

export const sessionService = new SessionService()
