<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-6">User Settings</h2>
      
      <!-- Profile Preview -->
      <div class="flex items-center gap-4 mb-6">
        <div class="avatar">
          <div class="w-24 h-24 rounded-full">
            <img 
              v-if="imagePreview || currentUser.profile_image" 
              :src="imagePreview || `http://localhost:3000/${currentUser.profile_image}`" 
              alt="Profile"
              class="w-full h-full object-cover"
            />
            <div v-else class="bg-neutral-focus text-neutral-content rounded-full w-24 h-24 flex items-center justify-center">
              <span class="text-3xl">{{ userInitials }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <input type="file" ref="fileInput" class="hidden" @change="handleImageChange" accept="image/*">
          <button class="btn btn-primary" @click="$refs.fileInput.click()">Change Profile Picture</button>
          <button v-if="currentUser.profile_image" class="btn btn-error" @click="removeProfilePicture">Remove Picture</button>
        </div>
      </div>

      <!-- Settings Form -->
      <form @submit.prevent="saveChanges" class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Username</span>
          </label>
          <input 
            type="text" 
            v-model="formData.username" 
            class="input input-bordered" 
            :class="{'input-error': errors.username}"
          />
          <label v-if="errors.username" class="label">
            <span class="label-text-alt text-error">{{ errors.username }}</span>
          </label>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Email</span>
          </label>
          <input 
            type="email" 
            v-model="formData.email" 
            class="input input-bordered"
            :class="{'input-error': errors.email}"
          />
          <label v-if="errors.email" class="label">
            <span class="label-text-alt text-error">{{ errors.email }}</span>
          </label>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Current Password (required for changes)</span>
          </label>
          <input 
            type="password" 
            v-model="formData.currentPassword" 
            class="input input-bordered"
            :class="{'input-error': errors.currentPassword}"
          />
          <label v-if="errors.currentPassword" class="label">
            <span class="label-text-alt text-error">{{ errors.currentPassword }}</span>
          </label>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">New Password (optional)</span>
          </label>
          <input 
            type="password" 
            v-model="formData.newPassword" 
            class="input input-bordered"
            :class="{'input-error': errors.newPassword}"
          />
          <label v-if="errors.newPassword" class="label">
            <span class="label-text-alt text-error">{{ errors.newPassword }}</span>
          </label>
        </div>

        <div class="form-control mt-6">
          <button type="submit" class="btn btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>

        <!-- Success/Error Messages -->
        <div v-if="successMessage" class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{{ successMessage }}</span>
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{{ errorMessage }}</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { sessionService } from '../services/sessionService'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:currentUser'])

// Form data
const formData = reactive({
  username: props.currentUser.username,
  email: props.currentUser.email,
  currentPassword: '',
  newPassword: ''
})

// State
const fileInput = ref(null)
const imagePreview = ref(null)
const selectedImage = ref(null)
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const errors = reactive({
  username: '',
  email: '',
  currentPassword: '',
  newPassword: ''
})

// Computed
const userInitials = computed(() => {
  return formData.username.charAt(0).toUpperCase()
})

// Methods
const handleImageChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedImage.value = file
    imagePreview.value = URL.createObjectURL(file)
  }
}

const removeProfilePicture = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/profile/remove-image', {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to remove profile picture')
    }

    const data = await response.json()
    emit('update:currentUser', { ...props.currentUser, profile_image: null })
    successMessage.value = 'Profile picture removed successfully'
  } catch (error) {
    errorMessage.value = error.message
  }
}

const validateForm = () => {
  let isValid = true
  errors.username = ''
  errors.email = ''
  errors.currentPassword = ''
  errors.newPassword = ''

  if (!formData.username) {
    errors.username = 'Username is required'
    isValid = false
  }

  if (!formData.email) {
    errors.email = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Invalid email format'
    isValid = false
  }

  if (!formData.currentPassword) {
    errors.currentPassword = 'Current password is required to make changes'
    isValid = false
  }

  if (formData.newPassword && formData.newPassword.length < 6) {
    errors.newPassword = 'New password must be at least 6 characters'
    isValid = false
  }

  return isValid
}

const saveChanges = async () => {
  try {
    if (!validateForm()) return

    isSaving.value = true
    errorMessage.value = ''
    successMessage.value = ''

    const formDataToSend = new FormData()
    formDataToSend.append('username', formData.username)
    formDataToSend.append('email', formData.email)
    formDataToSend.append('currentPassword', formData.currentPassword)
    if (formData.newPassword) {
      formDataToSend.append('newPassword', formData.newPassword)
    }
    if (selectedImage.value) {
      formDataToSend.append('profile_image', selectedImage.value)
    }

    const response = await fetch('http://localhost:3000/api/profile/update', {
      method: 'POST',
      credentials: 'include',
      body: formDataToSend
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile')
    }

    // Update session and parent component
    sessionService.updateSession(data.user)
    emit('update:currentUser', data.user)

    // Reset form
    formData.currentPassword = ''
    formData.newPassword = ''
    selectedImage.value = null
    imagePreview.value = null

    successMessage.value = 'Profile updated successfully'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSaving.value = false
  }
}
</script>
