<template>
  <div class="min-h-screen flex flex-col" :data-theme="theme">
    <nav class="navbar bg-base-100 shadow-lg h-16">
      <div class="flex-1">
        <a class="btn btn-ghost normal-case text-xl">Windsurf SPA / small errors are cute...</a>
      </div>
      <div class="flex-none gap-2 nav-right">
        <!-- Theme Selector - Always visible -->
        <div class="dropdown dropdown-end nav-item">
          <label tabindex="0" class="btn m-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
            Theme
          </label>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li v-for="availableTheme in themes" :key="availableTheme">
              <a :class="{ 'active': theme === availableTheme }" @click="setTheme(availableTheme)">
                {{ availableTheme.charAt(0).toUpperCase() + availableTheme.slice(1) }}
              </a>
            </li>
          </ul>
        </div>
        
        <!-- User Menu - Only when authenticated -->
        <div class="flex-none gap-2 nav-item" v-if="isAuthenticated">
          <NotificationBell />
          <div class="dropdown dropdown-end nav-item">
            <label tabindex="0" class="btn btn-ghost btn-circle avatar">
              <div class="w-10 rounded-full">
                <img 
                  v-if="profileImageUrl" 
                  :src="profileImageUrl" 
                  alt="Profile"
                  class="w-full h-full object-cover"
                />
                <div v-else class="bg-neutral-focus text-black dark:text-white rounded-full w-10 h-10 flex items-center justify-center">
                  <span>{{ userInitials }}</span>
                </div>
              </div>
            </label>
            <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><a @click="showSettings = true">Settings</a></li>
              <li><a @click="logout">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>
    </nav>

    <main class="flex-1 container mx-auto px-4 py-6 max-w-7xl">
      <div class="max-h-[calc(100vh-4rem)] overflow-y-auto">
        <template v-if="!isAuthenticated">
          <Welcome v-if="!showAuth" @start="showAuth = true" />
          <Auth v-else @auth-success="handleAuthSuccess" />
        </template>
        
        <template v-else>
          <div class="flex items-center gap-4 mb-4">
            <div class="avatar">
              <div class="w-16 h-16 rounded-full">
                <img 
                  v-if="profileImageUrl" 
                  :src="profileImageUrl" 
                  alt="Profile"
                  class="w-full h-full object-cover"
                />
                <div v-else class="bg-neutral-focus text-black dark:text-white rounded-full w-16 h-16 flex items-center justify-center">
                  <span class="text-2xl">{{ userInitials }}</span>
                </div>
              </div>
            </div>
            <h1 class="text-4xl font-bold">Welcome, {{ username }}!</h1>
          </div>
          <p class="text-lg mb-8">Manage your tasks efficiently with our task management system.</p>
          
          <!-- User Settings Modal -->
          <dialog :open="showSettings" class="modal">
            <div class="modal-box w-11/12 max-w-3xl">
              <form method="dialog">
                <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="showSettings = false">✕</button>
              </form>
              <UserSettings 
                v-if="showSettings"
                :current-user="currentUser"
                @update:current-user="handleUserUpdate"
              />
            </div>
            <form method="dialog" class="modal-backdrop">
              <button @click="showSettings = false">close</button>
            </form>
          </dialog>

          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">Your Tasks</h2>
            <TaskManager />
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TaskManager from './components/TaskManager.vue'
import Welcome from './components/Welcome.vue'
import Auth from './components/Auth.vue'
import UserSettings from './components/UserSettings.vue'
import NotificationBell from './components/NotificationBell.vue'
import { authService } from './services/authService'
import { sessionService } from './services/sessionService'

const theme = ref('light')
const themes = ['light', 'dark', 'cyberpunk', 'cupcake', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade', 'night', 'coffee', 'winter', 'pastel', 'fantasy', 'wireframe', 'black', 'luxury', 'dracula', 'lofi', 'nord']
const showAuth = ref(false)
const showSettings = ref(false)
const isAuthenticated = ref(false)
const currentUser = ref(null)

// Computed properties
const username = computed(() => currentUser.value?.username || '')
const userInitials = computed(() => {
  if (!username.value) return '?'
  return username.value.charAt(0).toUpperCase()
})
const profileImageUrl = computed(() => {
  if (!currentUser.value?.profile_image) return null
  // Ensure we have the correct path
  return `http://localhost:3000/${currentUser.value.profile_image}`
})

// Theme management
const setTheme = (newTheme) => {
  theme.value = newTheme
  localStorage.setItem('theme', newTheme)
}

// Auth handlers
const handleAuthSuccess = async (userData) => {
  currentUser.value = userData.user
  isAuthenticated.value = true
  showAuth.value = false
}

const logout = async () => {
  try {
    await authService.logout()
    currentUser.value = null
    isAuthenticated.value = false
    sessionService.clearSession()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// Methods
const handleUserUpdate = (updatedUser) => {
  currentUser.value = updatedUser
  showSettings.value = false
}

// Initialize on mount
onMounted(async () => {
  try {
    // Check authentication
    const user = await authService.getCurrentUser()
    if (user) {
      currentUser.value = user
      isAuthenticated.value = true
    }
  } catch (error) {
    console.error('Error checking authentication:', error)
    isAuthenticated.value = false
  }

  // Load theme
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme && themes.includes(savedTheme)) {
    theme.value = savedTheme
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark'
  }
})
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--color-background-soft);
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-item {
  display: flex;
  align-items: center;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-picture {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.username {
  margin: 0 0.5rem;
}

.logout-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: var(--color-background-mute);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.logout-btn:hover {
  background-color: var(--color-background-soft);
}
</style>
