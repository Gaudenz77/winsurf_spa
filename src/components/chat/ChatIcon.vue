<template>
  <div class="relative">
    <button 
      @click="toggleChat"
      class="btn btn-ghost btn-circle"
      :class="{ 'text-primary': isOpen }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </button>
    
    <!-- Unread indicator -->
    <div v-if="unreadCount > 0" 
         class="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-1 text-xs bg-error text-error-content rounded-full">
      {{ unreadCount }}
    </div>
  </div>

  <!-- Chat Sidebar -->
  <ChatSidebar 
    :is-open="isOpen"
    @close="isOpen = false"
  />
</template>

<script setup>
import { ref } from 'vue'
import ChatSidebar from './ChatSidebar.vue'

const isOpen = ref(false)
const unreadCount = ref(0) // This will be managed by the chat store later

const toggleChat = () => {
  isOpen.value = !isOpen.value
}
</script>
