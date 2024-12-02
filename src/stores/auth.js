import { defineStore } from 'pinia'
import axios from 'axios'
import { API_URL } from '../config'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false
  }),
  
  actions: {
    async login(credentials) {
      try {
        const response = await axios.post(`${API_URL}/api/auth/login`, credentials, {
          withCredentials: true
        })
        this.user = response.data.user
        this.isAuthenticated = true
        return response.data
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    async logout() {
      try {
        await axios.post(`${API_URL}/api/auth/logout`, {}, {
          withCredentials: true
        })
        this.user = null
        this.isAuthenticated = false
      } catch (error) {
        console.error('Logout error:', error)
        throw error
      }
    },

    async checkAuth() {
      try {
        const response = await axios.get(`${API_URL}/api/auth/check`, {
          withCredentials: true
        })
        this.user = response.data.user
        this.isAuthenticated = true
        return response.data
      } catch (error) {
        this.user = null
        this.isAuthenticated = false
        throw error
      }
    }
  },

  getters: {
    currentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated
  }
})