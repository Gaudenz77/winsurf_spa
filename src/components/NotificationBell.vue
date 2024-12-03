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
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import notificationService from '../services/notificationService'
import { API_URL } from '../config'

const authStore = useAuthStore()
const notifications = ref([])
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)
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
  try {
    console.log('Loading notifications...');
    loading.value = true;
    error.value = null;
    
    if (!authStore.isAuthenticated) {
      console.log('User not authenticated, skipping notification load');
      loading.value = false;
      return;
    }

    const data = await notificationService.getUnreadNotifications();
    console.log('Notifications loaded:', data);
    
    if (data && data.notifications) {
      notifications.value = data.notifications;
    }
  } catch (err) {
    console.error('Error loading notifications:', err);
    error.value = 'Failed to load notifications';
    notifications.value = [];
  } finally {
    loading.value = false;
  }
}

const connectWebSocket = () => {
  try {
    console.log('Connecting to WebSocket...');
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
      console.log('WebSocket connection established');
      // Send authentication message
      if (authStore.user && authStore.user.id) {
        ws.send(JSON.stringify({
          type: 'auth',
          userId: authStore.user.id
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'notification') {
          // Add new notification and force reactivity
          const newNotification = {
            ...data.data,
            is_read: false
          };
          notifications.value = [newNotification, ...notifications.value];
          console.log('New notification added, total count:', notifications.value.length);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      reconnectWebSocket();
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      reconnectWebSocket();
    };
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error);
    reconnectWebSocket();
  }
};

const reconnectWebSocket = () => {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;
  console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  reconnectTimeout = setTimeout(() => {
    connectWebSocket();
  }, 2000 * Math.min(reconnectAttempts, 5)); // Exponential backoff, max 10 seconds
};

const markAsRead = async (notificationId) => {
  try {
    await notificationService.markAsRead(notificationId)
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.is_read = true
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
