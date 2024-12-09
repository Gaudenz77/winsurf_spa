<template>
  <div 
    class="chat-sidebar fixed top-0 right-0 h-full bg-base-200 shadow-lg transition-transform duration-300 ease-in-out"
    :class="{ 'translate-x-full': !isOpen }"
    style="width: 23rem; z-index: 1000;"
  >
    <!-- Header -->
    <div class="flex justify-between items-center p-4 bg-primary text-primary-content">
      <h2 class="text-lg font-bold">Chat</h2>
      <button @click="$emit('close')" class="btn btn-ghost btn-sm  pt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Channels Section -->
    <div class="p-4">
      <h3 class="text-sm font-bold mb-2 text-base-content/70">Channels</h3>
      <ul class="space-y-1">
        <li v-for="channel in channels" :key="channel.id"
            @click="selectChannel(channel)"
            class="flex items-center p-2 rounded-lg cursor-pointer hover:bg-base-300"
            :class="{ 'bg-base-300': selectedChannel?.id === channel.id }">
          <span class="text-base-content"># {{ channel.name }}</span>
        </li>
      </ul>
    </div>

    <!-- Direct Messages Section -->
    <div class="p-4">
      <h3 class="text-sm font-bold mb-2 text-base-content/70">Direct Messages</h3>
      <ul class="space-y-1">
        <li v-for="dm in directMessages" :key="dm.id"
            @click="selectDM(dm)"
            class="flex items-center p-2 rounded-lg cursor-pointer hover:bg-base-300"
            :class="{ 'bg-base-300': selectedDM?.id === dm.id }">
          <div class="w-2 h-2 rounded-full mr-2" 
               :class="dm.online ? 'bg-success' : 'bg-base-content/30'"></div>
          <span class="text-base-content">{{ dm.username }}</span>
        </li>
      </ul>
    </div>

    <!-- Chat Window -->
    <div v-if="selectedChannel || selectedDM" class="absolute bottom-0 left-0 right-0 bg-base-100" style="height: calc(100% - 300px);">
      <!-- Chat Header -->
      <div class="p-4 border-b border-base-300">
        <h3 class="font-bold">
          {{ selectedChannel ? '#' + selectedChannel.name : '@' + selectedDM?.username }}
        </h3>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="p-4 overflow-y-auto" style="height: calc(100% - 120px); margin-right: 1rem;">
        <div v-for="message in messages" :key="message.id">
          <ChatMessage 
            :message="message" 
            :targetId="selectedChannel?.id || selectedDM?.id"
          />
        </div>
        <div v-if="isLoading" class="text-center p-4">
          Loading more messages...
        </div>
      </div>

      <!-- Message Input -->
      <div class="absolute bottom-0 left-0 right-0 p-4 bg-base-200 border-t border-base-300">
        <div class="flex">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Type a message..."
            class="input input-bordered flex-grow mr-2"
          />
          <button @click="sendMessage" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useChatStore } from '../../stores/chat'
import { API_URL } from '../../config'
import axios from 'axios'
import ChatMessage from './ChatMessage.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const authStore = useAuthStore()
const chatStore = useChatStore()
const newMessage = ref('')
const selectedChannel = ref(null)
const selectedDM = ref(null)
const messagesContainer = ref(null)
const isLoading = ref(false)
const hasMoreMessages = ref(true)
const page = ref(1)

onMounted(async () => {
  console.log('ChatSidebar mounted, initializing...')
  await chatStore.initialize()
  setupScrollListener()
})

const channels = computed(() => chatStore.channels)
const directMessages = computed(() => chatStore.directMessages)
const messages = computed(() => {
  const key = selectedChannel.value?.id || selectedDM.value?.id
  return chatStore.messages[key] || []
})

const selectChannel = async (channel) => {
  selectedChannel.value = channel
  selectedDM.value = null
  await chatStore.loadChannelHistory(channel.id)
  chatStore.markAsRead(channel.id)
  page.value = 1
  hasMoreMessages.value = true
}

const selectDM = async (dm) => {
  selectedDM.value = dm
  selectedChannel.value = null
  await chatStore.loadDirectMessageHistory(dm.id)
  chatStore.markAsRead(dm.id)
  page.value = 1
  hasMoreMessages.value = true
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  const targetId = selectedChannel.value?.id || selectedDM.value?.id
  const type = selectedChannel.value ? 'channel' : 'direct'
  
  await chatStore.sendMessage(newMessage.value, targetId, type)
  newMessage.value = ''
  
  nextTick(() => {
    scrollToBottom()
  })
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Today: show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
}

const loadMoreMessages = async () => {
  if (isLoading.value || !hasMoreMessages.value) return

  isLoading.value = true
  try {
    let response
    if (selectedChannel.value) {
      response = await axios.get(`/api/messages/channel/${selectedChannel.value.id}`, {
        params: { 
          page: page.value, 
          limit: 50 
        }
      })
      // Use the store's prependMessages method
      chatStore.prependMessages(selectedChannel.value.id, response.data.messages)
    } else if (selectedDM.value) {
      response = await axios.get(`/api/messages/direct/${selectedDM.value.id}`, {
        params: { 
          page: page.value, 
          limit: 50 
        }
      })
      // Use the store's prependMessages method
      chatStore.prependMessages(selectedDM.value.id, response.data.messages)
    } else {
      return
    }

    hasMoreMessages.value = response.data.hasMore
    if (response.data.messages.length > 0) {
      page.value++
    }

    // Maintain scroll position after loading
    nextTick(() => {
      if (messagesContainer.value) {
        const currentScrollHeight = messagesContainer.value.scrollHeight
        const currentScrollTop = messagesContainer.value.scrollTop
        messagesContainer.value.scrollTop = currentScrollHeight - currentScrollTop
      }
    })
  } catch (error) {
    console.error('Error loading more messages:', error)
  } finally {
    isLoading.value = false
  }
}

const setupScrollListener = () => {
  const container = messagesContainer.value
  if (!container) return

  container.addEventListener('scroll', () => {
    if (container.scrollTop === 0) {
      loadMoreMessages()
    }
  })
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })
</script>

<style scoped>
.chat-sidebar {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}
.chat-bubble-primary {
  background-color: #4f46e5;
  color: #ffffff;
}
.chat-bubble-accent {
  background-color: #f0f0f0;
  color: #333333;
}
</style>
