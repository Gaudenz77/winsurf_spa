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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import notificationService from '../services/notificationService'
import { API_URL } from '../config'

const authStore = useAuthStore()
const notifications = ref([])
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)
const loading = ref(false)
const error = ref(null)
let ws = null

// Load notifications on mount
onMounted(async () => {
  console.log('NotificationBell mounted, initializing...')
  if (authStore.isAuthenticated) {
    console.log('User is authenticated, connecting WebSocket...')
    await loadNotifications()
    connectWebSocket()
  }
})

const loadNotifications = async () => {
  try {
    console.log('Loading notifications...')
    loading.value = true
    const response = await notificationService.getUnreadNotifications()
    console.log('Notifications loaded:', response)
    notifications.value = response.notifications || []
  } catch (err) {
    console.error('Error loading notifications:', err)
    error.value = 'Failed to load notifications'
  } finally {
    loading.value = false
  }
}

const connectWebSocket = () => {
  console.log('Connecting to WebSocket...')
  const wsUrl = `ws://localhost:3000`
  console.log('WebSocket URL:', wsUrl)
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('WebSocket connection established')
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('WebSocket message received:', data)
      
      if (data.type === 'notification') {
        console.log('Processing notification:', data.data)
        // Create new notification and update the array
        const newNotification = {
          ...data.data,
          is_read: false
        }
        
        // Create a new array to ensure reactivity
        notifications.value = [newNotification, ...notifications.value]
        console.log('Updated notifications array:', notifications.value)
        console.log('New unread count:', unreadCount.value)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  ws.onclose = (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason)
    // Try to reconnect after a delay
    setTimeout(connectWebSocket, 5000)
  }
}

const markAsRead = async (notificationId) => {
  try {
    await notificationService.markAsRead(notificationId)
    // Remove the notification from the array
    notifications.value = notifications.value.filter(n => n.id !== notificationId)
    console.log('Notification marked as read, new count:', unreadCount.value)
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await notificationService.markAllAsRead()
    notifications.value.forEach(notification => {
      notification.is_read = true
    })
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

// Cleanup on unmount
onBeforeUnmount(() => {
  if (ws) {
    console.log('Closing WebSocket connection...')
    ws.close()
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
