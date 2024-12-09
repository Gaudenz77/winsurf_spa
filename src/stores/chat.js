import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import ChatService from '../services/chatService'
import { API_URL, WS_URL } from '../config'

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
    
    // Create message object with full profile image URL
    const message = {
      id: data.id,
      content: data.content,
      username: data.senderUsername,
      profile_image: data.profile_image ? `${API_URL}/${data.profile_image}` : null,
      timestamp: new Date(data.timestamp),
      senderId: data.senderId,
      targetId
    }

    // Add message to state
    if (!messages.value[targetId]) {
      messages.value[targetId] = []
    }
    messages.value[targetId] = [...messages.value[targetId], message]
    
    // Increment unread count if not our message
    if (senderId !== authStore.user.id) {
      incrementUnreadCount(targetId)
    }
  }

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    console.log('Initializing WebSocket connection to:', WS_URL)
    ws.value = new WebSocket(WS_URL)

    ws.value.onopen = () => {
      console.log('WebSocket connection established')
    }

    ws.value.onmessage = (event) => {
      console.log('WebSocket message received:', event.data)
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'CHAT_MESSAGE') {
          handleNewMessage(data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.value.onclose = () => {
      console.log('WebSocket connection closed')
      // Attempt to reconnect after a delay
      setTimeout(initializeWebSocket, 3000)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  // Initialize channels and DMs
  const initialize = async () => {
    try {
      console.log('Initializing chat store...')
      // Initialize WebSocket first
      initializeWebSocket()
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
        initializeWebSocket()
      } catch (error) {
        console.error('Failed to reconnect WebSocket:', error)
        throw new Error('WebSocket connection failed')
      }
    }

    try {
      // Create optimistic message
      const optimisticMessage = {
        id: Date.now(), // Temporary ID
        content,
        username: authStore.user.username,
        profile_image: authStore.user.profile_image ? `${API_URL}/${authStore.user.profile_image}` : null,
        senderId: authStore.user.id,
        timestamp: new Date(),
        targetId
      }
      
      // Add message optimistically
      addMessage(optimisticMessage)
      
      // Send message through WebSocket
      ws.value.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        content,
        targetId,
        messageType: type,
        senderUsername: authStore.user.username,
        profile_image: authStore.user.profile_image,
        senderId: authStore.user.id,
        timestamp: new Date().toISOString()
      }))
      
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  const markAsRead = (targetId) => {
    unreadCounts.value[targetId] = 0
  }

  const incrementUnreadCount = (targetId) => {
    unreadCounts.value[targetId] = (unreadCounts.value[targetId] || 0) + 1
  }

  // Load message history for a channel
  const loadChannelHistory = async (channelId) => {
    try {
      console.log('Loading channel history for:', channelId);
      const response = await ChatService.getChannelMessages(channelId, 1, 50);
      
      // Initialize messages array if needed
      if (!messages.value[channelId]) {
        messages.value[channelId] = [];
      }
      
      // Update messages with history
      messages.value[channelId] = (response.messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.sender_username,
        profile_image: msg.profile_image ? `${API_URL}/${msg.profile_image}` : null,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at),
        targetId: channelId
      }));

      return messages.value[channelId];
    } catch (error) {
      console.error('Error loading channel history:', error);
      throw error;
    }
  };

  // Load message history for direct messages
  const loadDirectMessageHistory = async (otherUserId) => {
    try {
      console.log('Loading direct message history with:', otherUserId);
      const response = await ChatService.getDirectMessages(otherUserId, 1, 50);
      
      // Initialize messages array if needed
      if (!messages.value[otherUserId]) {
        messages.value[otherUserId] = [];
      }
      
      // Update messages with history
      messages.value[otherUserId] = (response.messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.sender_username,
        profile_image: msg.profile_image ? `${API_URL}/${msg.profile_image}` : null,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at),
        targetId: otherUserId
      }));

      return messages.value[otherUserId];
    } catch (error) {
      console.error('Error loading direct message history:', error);
      throw error;
    }
  };

  // Add method to prepend messages for pagination
  const prependMessages = (targetId, newMessages) => {
    if (!messages.value[targetId]) {
      messages.value[targetId] = [];
    }
    
    // Prepend new messages, avoiding duplicates
    const existingIds = new Set(messages.value[targetId].map(m => m.id));
    const filteredNewMessages = newMessages
      .filter(msg => !existingIds.has(msg.id))
      .map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.sender_username,
        profile_image: msg.profile_image ? `${API_URL}/${msg.profile_image}` : null,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at),
        targetId
      }));
  
    // Sort messages by timestamp to ensure correct order
    messages.value[targetId] = [
      ...filteredNewMessages, 
      ...messages.value[targetId]
    ].sort((a, b) => a.timestamp - b.timestamp);
  }

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
    loadDirectMessageHistory,
    prependMessages
  }
})
