<template>
  <div class="min-h-[80vh] flex items-center justify-center">
    <div class="card w-96 bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center mb-6">
          {{ isLogin ? 'Welcome Back!' : 'Create Account' }}
        </h2>
        
        <form @submit.prevent="handleSubmit">
          <!-- Username field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Username</span>
            </label>
            <input 
              type="text" 
              v-model="formData.username"
              class="input input-bordered" 
              required
            />
          </div>

          <!-- Email field -->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input 
              type="email" 
              v-model="formData.email"
              class="input input-bordered" 
              required
            />
          </div>

          <!-- Password field -->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <input 
              type="password" 
              v-model="formData.password"
              class="input input-bordered" 
              required
            />
          </div>

          <!-- Profile Picture upload field-->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Profile Picture</span>
            </label>
            <input type="file" class="file-input file-input-bordered w-full" accept="image/*" @change="handleImageChange"/>
            <div v-if="imagePreview" class="mt-4">
              <img :src="imagePreview" class="w-24 h-24 object-cover" />
            </div>
          </div>

          <!-- Error message -->
          <div v-if="error" class="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{{ error }}</span>
          </div>

          <!-- Submit button -->
          <div class="form-control mt-6">
            <button type="submit" class="btn btn-primary">
              {{ isLogin ? 'Sign In' : 'Sign Up' }}
            </button>
          </div>

          <!-- Toggle between login and signup -->
          <div class="text-center mt-4">
            <a @click="toggleMode" class="link link-hover">
              {{ isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in' }}
            </a>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { sessionService } from '../services/sessionService'

const emit = defineEmits(['auth-success'])

const isLogin = ref(true)
const error = ref('')
const imagePreview = ref('')
const selectedImage = ref(null)

const formData = reactive({
  username: '',
  email: '',
  password: ''
  
})

const handleImageChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedImage.value = file
    imagePreview.value = URL.createObjectURL(file)
  }
}

const handleSubmit = async () => {
  try {
    error.value = ''
    const endpoint = isLogin.value ? '/api/auth/login' : '/api/auth/signup'

    // Validate required fields
    if (!formData.username || !formData.email || !formData.password) {
      throw new Error('Please fill in all required fields')
    }

    let requestBody
    let headers = {}

    if (isLogin.value) {
      requestBody = JSON.stringify(formData)
      headers['Content-Type'] = 'application/json'
    } else {
      // For signup, use FormData to handle file upload
      requestBody = new FormData()
      requestBody.append('username', formData.username)
      requestBody.append('email', formData.email)
      requestBody.append('password', formData.password)
      if (selectedImage.value) {
        requestBody.append('profile_image', selectedImage.value)
      }
    }

    console.log('Form data being sent:', {
      username: formData.username,
      email: formData.email,
      hasImage: !!selectedImage.value
    })

    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: isLogin.value ? headers : undefined,
      body: requestBody
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed')
    }

    // Create session
    sessionService.createSession({
      username: formData.username,
      email: formData.email,
      token: data.token,
      profileImage: data.user?.profile_image
    })

    // Reset form and preview
    formData.username = ''
    formData.email = ''
    formData.password = ''
    imagePreview.value = ''
    selectedImage.value = null

    // Emit success event
    emit('auth-success', data)
  } catch (err) {
    error.value = err.message
    console.error('Auth error:', err)
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  imagePreview.value = ''
  selectedImage.value = null
  formData.username = ''
  formData.email = ''
  formData.password = ''
}
</script>
