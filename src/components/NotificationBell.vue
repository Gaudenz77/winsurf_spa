<template>
  <div class="dropdown dropdown-end">
    <label tabindex="0" class="btn btn-ghost btn-circle">
      <div class="indicator">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span v-if="unreadCount > 0" class="badge badge-sm indicator-item">{{ unreadCount }}</span>
      </div>
    </label>
    <div tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-80">
      <div class="notification-header flex justify-between items-center mb-2">
        <h3 class="font-bold text-lg">Notifications</h3>
        <button v-if="notifications.length > 0" 
                @click="markAllAsRead" 
                class="btn btn-sm">
          Mark all as read
        </button>
      </div>
      <div class="notification-list max-h-96 overflow-y-auto">
        <div v-if="loading" class="p-4 text-center">
          Loading notifications...
        </div>
        <div v-else-if="error" class="p-4 text-center text-error">
          {{ error }}
        </div>
        <div v-else-if="notifications.length === 0" class="p-4 text-center text-gray-500">
          No notifications
          <div class="text-xs mt-2">
            WebSocket Status: {{ ws?.readyState === 1 ? 'Connected' : 'Disconnected' }}
          </div>
        </div>
        <div v-else v-for="notification in notifications" 
             :key="notification.id" 
             class="notification-item p-3 border-b last:border-b-0 hover:bg-base-100" 
             :class="{ 'bg-base-200': !notification.is_read }">
          <div class="notification-content">
            <div class="flex justify-between items-start mb-1">
              <span class="badge" :class="getNotificationBadgeClass(notification.type)">
                {{ notification.type_display || notification.type }}
              </span>
              <small class="text-gray-500">{{ formatDate(notification.created_at) }}</small>
            </div>
            <p class="text-sm mb-1">{{ notification.message }}</p>
            <div class="text-xs text-gray-500">
              <span v-if="notification.task_title">
                Task: {{ notification.task_title }}
              </span>
              <span v-if="notification.task_status" class="ml-2">
                Status: {{ notification.task_status }}
              </span>
              <span v-if="notification.task_priority" class="ml-2">
                Priority: {{ notification.task_priority }}
              </span>
            </div>
            <div class="mt-2 flex justify-end">
              <button v-if="!notification.is_read" 
                      @click="markAsRead(notification.id)" 
                      class="btn btn-xs">
                Mark as read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import notificationService from '../services/notificationService'
import { API_URL } from '../config'

const authStore = useAuthStore()
const notifications = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const error = ref(null)
let ws = null
let reconnectAttempts = 0
let reconnectTimeout = null
const maxReconnectAttempts = 5

// Watch for authentication state changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  console.log('Auth state changed:', isAuthenticated)
  if (isAuthenticated) {
    loadNotifications()
    connectWebSocket()
  } else {
    if (ws) {
      ws.close()
      ws = null
    }
    notifications.value = []
    unreadCount.value = 0
  }
})

const loadNotifications = async () => {
  if (!authStore.isAuthenticated) {
    console.log('Not authenticated, skipping notification load')
    return
  }

  try {
    loading.value = true
    error.value = null
    console.log('Loading notifications...')
    const response = await notificationService.getUnreadNotifications()
    console.log('Loaded notifications response:', response)
    
    if (Array.isArray(response.notifications)) {
      notifications.value = response.notifications
      console.log('Set notifications array:', notifications.value)
    } else if (Array.isArray(response)) {
      notifications.value = response
      console.log('Set notifications directly:', notifications.value)
    } else {
      console.error('Unexpected notifications format:', response)
      notifications.value = []
    }
    
    updateUnreadCount()
  } catch (err) {
    console.error('Error loading notifications:', err)
    error.value = 'Failed to load notifications'
  } finally {
    loading.value = false
  }
}

const connectWebSocket = () => {
  if (!authStore.isAuthenticated) {
    console.log('Not authenticated, skipping WebSocket connection')
    return
  }

  if (ws?.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected')
    return
  }

  // Explicitly connect to backend port 3000
  const wsUrl = 'ws://localhost:3000'
  console.log('Attempting WebSocket connection to:', wsUrl)
  
  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connection established')
      reconnectAttempts = 0
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      loadNotifications()
    }

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason)
      if (authStore.isAuthenticated) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
        reconnectAttempts++
        
        if (reconnectAttempts <= maxReconnectAttempts) {
          console.log(`Attempting to reconnect in ${timeout}ms (attempt ${reconnectAttempts})`)
          reconnectTimeout = setTimeout(connectWebSocket, timeout)
        } else {
          console.log('Max reconnection attempts reached')
          error.value = 'Connection lost. Please refresh the page.'
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onmessage = (event) => {
      try {
        console.log('Raw WebSocket message received:', event.data)
        const data = JSON.parse(event.data)
        console.log('Parsed WebSocket message:', data)
        
        if (data.type === 'notification') {
          console.log('Processing notification:', data.data)
          const notification = {
            ...data.data,
            created_at: data.data.created_at || new Date().toISOString()
          }
          
          console.log('Adding notification to list:', notification)
          notifications.value = [notification, ...notifications.value]
          updateUnreadCount()
          
          // Show toast notification
          const toast = document.createElement('div')
          toast.className = 'toast toast-end'
          toast.innerHTML = `
            <div class="alert alert-info">
              <span>${notification.message}</span>
            </div>
          `
          document.body.appendChild(toast)
          setTimeout(() => toast.remove(), 5000)
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err)
        console.error('Raw message:', event.data)
      }
    }
  } catch (error) {
    console.error('Error creating WebSocket connection:', error)
  }
}

const markAsRead = async (notificationId) => {
  try {
    await notificationService.markAsRead(notificationId)
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.is_read = true
      updateUnreadCount()
    }
  } catch (err) {
    console.error('Error marking notification as read:', err)
    error.value = 'Failed to mark notification as read'
  }
}

const markAllAsRead = async () => {
  try {
    await notificationService.markAllAsRead()
    notifications.value.forEach(notification => {
      notification.is_read = true
    })
    updateUnreadCount()
  } catch (err) {
    console.error('Error marking all notifications as read:', err)
    error.value = 'Failed to mark all notifications as read'
  }
}

const getNotificationBadgeClass = (type) => {
  const classes = {
    TASK_ASSIGNED: 'badge-primary',
    TASK_STATUS_CHANGED: 'badge-info',
    TASK_DUE_DATE_CHANGED: 'badge-warning',
    TASK_PRIORITY_CHANGED: 'badge-secondary',
    TASK_COMPLETED: 'badge-success',
    TASK_REMINDER: 'badge-accent'
  };
  return classes[type] || 'badge-neutral';
};

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const updateUnreadCount = () => {
  unreadCount.value = notifications.value.filter(n => !n.is_read).length
  console.log('Updated unread count:', unreadCount.value)
}

onMounted(() => {
  console.log('NotificationBell mounted, initializing...')
  if (authStore.isAuthenticated) {
    console.log('User is authenticated, connecting WebSocket...')
    loadNotifications()
    connectWebSocket()
  } else {
    console.log('User is not authenticated')
  }
})

onBeforeUnmount(() => {
  if (ws) {
    console.log('Closing WebSocket connection...')
    ws.close()
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
  }
})
</script>

<style scoped>
.notification-item {
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dropdown-content {
  min-width: 320px;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
}
</style>
