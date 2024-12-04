import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import ChatService from '../services/chatService'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const ws = ref(null)

  // State
  const channels = ref([])
  const directMessages = ref([])
  const messages = ref({}) // channelId/userId -> messages[]
  const unreadCounts = ref({})
  
  // Computed
  const totalUnreadCount = computed(() => {
    return Object.values(unreadCounts.value).reduce((acc, count) => acc + count, 0)
  })

  // Add message to state
  const addMessage = (message) => {
    const { targetId } = message
    if (!messages.value[targetId]) {
      messages.value[targetId] = []
    }
    // Use Vue's reactivity to update the array
    messages.value[targetId] = [...messages.value[targetId], message]
  }

  // Handle new message
  const handleNewMessage = (data) => {
    console.log('Handling new message:', data)
    const { targetId, messageType, senderId } = data
    
    // Skip if this is our own message (we already added it optimistically)
    if (senderId === authStore.user.id) {
      console.log('Skipping own message from WebSocket')
      return
    }
    
    // Create message object
    const message = {
      id: data.id,
      content: data.content,
      username: data.senderUsername,
      timestamp: new Date(data.timestamp),
      senderId: data.senderId,
      targetId
    }

    // Add message to state
    addMessage(message)

    // Update unread count for messages from others
    unreadCounts.value[targetId] = (unreadCounts.value[targetId] || 0) + 1
  }

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    return new Promise((resolve, reject) => {
      if (ws.value) {
        ws.value.close()
      }

      console.log('Initializing WebSocket connection...')
      ws.value = new WebSocket('ws://localhost:3000')

      ws.value.onopen = () => {
        console.log('Chat WebSocket connected successfully')
        resolve()
      }

      ws.value.onmessage = (event) => {
        console.log('Chat message received:', event.data)
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'CHAT_MESSAGE') {
            handleNewMessage(data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.value.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
        reject(error)
      }

      ws.value.onclose = () => {
        console.log('Chat WebSocket closed, attempting to reconnect...')
        setTimeout(() => initializeWebSocket().catch(console.error), 5000)
      }
    })
  }

  // Initialize channels and DMs
  const initialize = async () => {
    try {
      console.log('Initializing chat store...')
      // Initialize WebSocket first
      await initializeWebSocket()
      console.log('WebSocket initialized, setting up channels...')

      // Set up channels
      channels.value = [
        { id: 1, name: 'general' },
        { id: 2, name: 'random' },
        { id: 3, name: 'tasks' }
      ]
      
      // Set up DMs
      directMessages.value = []

      console.log('Chat store initialization complete')
    } catch (error) {
      console.error('Failed to initialize chat:', error)
      throw error // Re-throw to handle in component
    }
  }

  // Actions
  const sendMessage = async (content, targetId, type = 'channel') => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, attempting to reconnect...')
      try {
        await initializeWebSocket()
      } catch (error) {
        console.error('Failed to reconnect WebSocket:', error)
        throw new Error('WebSocket connection failed')
      }
    }

    const messageData = {
      type: 'CHAT_MESSAGE',
      content,
      targetId,
      messageType: type,
      senderId: authStore.user.id,
      senderUsername: authStore.user.username,
      timestamp: new Date().toISOString()
    }

    try {
      console.log('Sending message:', messageData)
      ws.value.send(JSON.stringify(messageData))
      
      // Add message optimistically
      addMessage({
        id: Date.now(), // This will be different from the server ID, but it's okay
        content,
        username: authStore.user.username,
        timestamp: new Date(),
        senderId: authStore.user.id,
        targetId
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  const markAsRead = (targetId) => {
    unreadCounts.value[targetId] = 0
  }

  // Load message history for a channel
  const loadChannelHistory = async (channelId) => {
    try {
      console.log('Loading channel history for:', channelId);
      const messageHistory = await ChatService.getChannelMessages(channelId);
      
      // Initialize messages array if needed
      if (!messages.value[channelId]) {
        messages.value[channelId] = [];
      }
      
      // Update messages with history
      messages.value[channelId] = messageHistory.map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.sender_username,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at),
        targetId: channelId
      }));
      
      console.log('Channel history loaded:', messages.value[channelId]);
    } catch (error) {
      console.error('Error loading channel history:', error);
    }
  };

  // Load message history for direct messages
  const loadDirectMessageHistory = async (otherUserId) => {
    try {
      console.log('Loading DM history with user:', otherUserId);
      const messageHistory = await ChatService.getDirectMessages(otherUserId);
      
      // Initialize messages array if needed
      if (!messages.value[otherUserId]) {
        messages.value[otherUserId] = [];
      }
      
      // Update messages with history
      messages.value[otherUserId] = messageHistory.map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.sender_username,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at),
        targetId: otherUserId
      }));
      
      console.log('DM history loaded:', messages.value[otherUserId]);
    } catch (error) {
      console.error('Error loading DM history:', error);
    }
  };

  return {
    channels,
    directMessages,
    messages,
    unreadCounts,
    totalUnreadCount,
    initialize,
    sendMessage,
    markAsRead,
    loadChannelHistory,
    loadDirectMessageHistory
  }
})
