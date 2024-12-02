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
      <div class="notification-header">
        <h3 class="font-bold text-lg">Notifications</h3>
        <button v-if="notifications.length > 0" @click="markAllAsRead" class="btn btn-sm">Mark all as read</button>
      </div>
      <div class="notification-list">
        <div v-if="notifications.length === 0" class="empty-state">
          No notifications
        </div>
        <div v-else v-for="notification in notifications" :key="notification.id" 
             class="notification-item" :class="{ 'unread': !notification.read_at }">
          <div class="notification-content">
            <p>{{ notification.message }}</p>
            <small>{{ formatDate(notification.created_at) }}</small>
          </div>
          <button v-if="!notification.read_at" 
                  @click="markAsRead(notification.id)" 
                  class="btn btn-ghost btn-xs">
            Mark as read
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import notificationService from '@/services/notificationService'

const notifications = ref([])
const unreadCount = ref(0)
let ws = null

// Load initial notifications
const loadNotifications = async () => {
  try {
    console.log('Loading initial notifications...')
    const response = await notificationService.getUnreadNotifications()
    notifications.value = response.notifications || []
    unreadCount.value = notifications.value.filter(n => !n.read_at).length
    console.log('Loaded notifications:', notifications.value)
    console.log('Unread count:', unreadCount.value)
  } catch (error) {
    console.error('Error loading notifications:', error)
  }
}

// WebSocket connection
const connectWebSocket = () => {
  const authStore = useAuthStore()
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1]
  
  if (!token) {
    console.error('No auth token found in cookies')
    return
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.hostname}:3000?token=${token}`
  
  console.log('Connecting to WebSocket with URL:', wsUrl)
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('WebSocket connected successfully')
  }

  ws.onmessage = (event) => {
    try {
      console.log('WebSocket message received:', event.data)
      const data = JSON.parse(event.data)
      
      if (data.type === 'NOTIFICATION') {
        console.log('Adding new notification:', data.notification)
        notifications.value.unshift(data.notification)
        if (!data.notification.read_at) {
          unreadCount.value++
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  ws.onclose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason)
    // Only try to reconnect if we're not closing intentionally
    if (event.code !== 1000) {
      console.log('Attempting to reconnect in 5 seconds...')
      setTimeout(connectWebSocket, 5000)
    }
  }
}

// Mark notification as read
const markAsRead = async (notificationId) => {
  try {
    console.log('Marking notification as read:', notificationId)
    await notificationService.markAsRead(notificationId)
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read_at = new Date()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      console.log('Updated unread count:', unreadCount.value)
    }
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

const markAllAsRead = async () => {
  try {
    console.log('Marking all notifications as read')
    await notificationService.markAllAsRead()
    notifications.value.forEach(notification => {
      notification.read_at = new Date()
    })
    unreadCount.value = 0
    console.log('All notifications marked as read')
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

// Format date
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

onMounted(() => {
  console.log('NotificationBell component mounted')
  loadNotifications()
  connectWebSocket()
})

onUnmounted(() => {
  console.log('NotificationBell component unmounting')
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.notification-item.unread {
  background-color: var(--color-background-mute);
}

.notification-content {
  flex: 1;
}

.notification-content p {
  margin: 0;
  font-size: 0.9rem;
}

.notification-content small {
  color: var(--color-text-light);
  font-size: 0.8rem;
}

.empty-state {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-light);
}

.indicator {
  position: relative;
  display: inline-flex;
}

.indicator-item {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(25%, -25%);
}
</style>
