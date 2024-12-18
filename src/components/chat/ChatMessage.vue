<template>
  <div 
    class="message-container" 
    :class="{ 
      'message-sent': isSentByCurrentUser, 
      'message-received': !isSentByCurrentUser 
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="message-content">
      <img 
        :src="message.profile_image || getDefaultAvatar(message.username)" 
        class="user-avatar" 
        alt="User Avatar"
      />
      <div 
        class="message-text-container"
        :class="{
          'sent-message': isSentByCurrentUser,
          'received-message': !isSentByCurrentUser
        }"
      >
        <div class="message-header">
          <span class="username">{{ message.username }}</span>
          <span class="timestamp">{{ formatMessageTime(message.timestamp) }}</span>
        </div>
        <div class="message-body">
          {{ message.content }}
        </div>
        
<!-- Reactions Display -->
<div 
  v-if="Object.values(messageReactions).some(reaction => reaction.count > 0)" 
  class="reactions-display"
>
  <div 
    v-for="(reactionData, reaction) in messageReactions" 
    :key="reaction" 
    class="reaction-item"
    @click="toggleReaction(reaction)"
  >
    <span class="reaction-emoji">{{ getReactionEmoji(reaction) }}</span>
    <span class="reaction-count" v-if="reactionData.count > 0">{{ reactionData.count }}</span>
  </div>
</div>


      </div>
    </div>

    <!-- Reaction Picker -->
    <div 
      v-if="showReactions" 
      class="reaction-picker"
      @mouseenter="handleReactionPickerEnter"
      @mouseleave="handleReactionPickerLeave"
    >
      <div 
        v-for="reaction in availableReactions" 
        :key="reaction"
        class="reaction-button"
        @click="addReaction(reaction)"
      >
        {{ getReactionEmoji(reaction) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  targetId: {
    type: [Number, String],
    required: true
  }
})

const authStore = useAuthStore()
const chatStore = useChatStore()

const showReactions = ref(false)
const reactionTimerRef = ref(null)

const availableReactions = [
  'thumbs_up', 
  'thumbs_down', 
  'heart', 
  'laugh', 
  'sad', 
  'wow', 
  'angry', 
  'celebrate'
]

// Default reactions structure
const initializedReactions = {
  "thumbs_up": { count: 0, userIds: [] },
  "sad": { count: 0, userIds: [] },
  "laugh": { count: 0, userIds: [] },
  "angry": { count: 0, userIds: [] },
  "celebrate": { count: 0, userIds: [] },
};

// Compute message reactions, merging defaults with existing ones
const messageReactions = computed(() => {
  console.log('Message Reactions:', props.message.reactions);
  const reactions = { ...initializedReactions }; // Initialize reactions structure

  if (props.message.reactions) {
    Object.keys(props.message.reactions).forEach((reaction) => {
      if (reactions[reaction]) {
        reactions[reaction].count = props.message.reactions[reaction];
      }
    });
  }

  return reactions; // Do not filter out counts <= 0
});




const isSentByCurrentUser = computed(() => 
  props.message.senderId === authStore.user.id
)

function handleMouseEnter() {
  if (reactionTimerRef.value) {
    clearTimeout(reactionTimerRef.value)
  }
  showReactions.value = true
}

function handleMouseLeave() {
  reactionTimerRef.value = setTimeout(() => {
    showReactions.value = false
  }, 500)
}

function handleReactionPickerEnter() {
  if (reactionTimerRef.value) {
    clearTimeout(reactionTimerRef.value)
  }
}

function handleReactionPickerLeave() {
  reactionTimerRef.value = setTimeout(() => {
    showReactions.value = false
  }, 200)
}

function getDefaultAvatar(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
}

function getReactionEmoji(reaction) {
  const emojiMap = {
    'thumbs_up': '👍',
    'thumbs_down': '👎',
    'heart': '❤️',
    'laugh': '😂',
    'sad': '😢',
    'wow': '😮',
    'angry': '😠',
    'celebrate': '🎉'
  }
  return emojiMap[reaction] || reaction
}

function formatMessageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}

async function addReaction(reaction) {
    try {
        await chatStore.addMessageReaction(
            props.targetId, 
            props.message.id, 
            reaction
        )
    } catch (error) {
        console.error('Failed to add reaction:', error)
    }
}

async function toggleReaction(reaction) {
  try {
    const userReactions = messageReactions.value[reaction]?.userIds || []
    
    if (userReactions.includes(authStore.user.id)) {
      await chatStore.removeMessageReaction(
        props.targetId, 
        props.message.id, 
        reaction
      )
    } else {
      await chatStore.addMessageReaction(
        props.targetId, 
        props.message.id, 
        reaction
      )
    }
  } catch (error) {
    console.error('Failed to toggle reaction:', error)
  }
}
</script>

<style scoped>
.message-container {
  display: flex;
  position: relative;
  margin-bottom: 10px;
  align-items: flex-start;
  width: 100%;
}

.message-sent {
  justify-content: flex-end;
}

.message-received {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  max-width: 70%;
  align-items: flex-start;
}

.message-sent .message-content {
  flex-direction: row-reverse;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin: 0 10px;
}

.message-text-container {
  border-radius: 10px;
  padding: 10px;
  position: relative;
  max-width: 100%;
}

.sent-message {
  background-color: #e6f3ff;  /* Light blue for sent messages */
  margin-right: 10px;
  align-self: flex-end;
}

.received-message {
  background-color: #f0f0f0;  /* Light gray for received messages */
  margin-left: 10px;
  align-self: flex-start;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.username {
  font-weight: bold;
  margin-right: 10px;
}

.timestamp {
  color: #888;
  font-size: 0.8em;
}

.message-body {
  word-wrap: break-word;
}

.reactions-display {
  display: flex;
  margin-top: 5px;
}

.reaction-item {
  display: flex;
  align-items: center;
  margin-right: 10px;
  cursor: pointer;
}

.reaction-emoji {
  margin-right: 3px;
}

.reaction-picker {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 5px;
  z-index: 10;
  cursor: default;
}

.reaction-button {
  margin: 0 5px;
  cursor: pointer;
  font-size: 1.2em;
  transition: transform 0.2s;
}

.reaction-button:hover {
  transform: scale(1.2);
}

/* Adjust positioning for sent and received messages */
.message-sent .reaction-picker {
  right: 0;
  left: auto;
  transform: none;
}

.message-received .reaction-picker {
  left: 50%;
  transform: translateX(-50%);
}
</style>
