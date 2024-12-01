<template>
  <div class="bg-base-200 rounded-lg shadow-lg">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Task Form -->
      <div class="p-4 lg:border-r lg:border-base-300">
        <form @submit.prevent="addTask" class="sticky top-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Task Title</span>
            </label>
            <input 
              type="text" 
              v-model="newTask.title" 
              class="input input-bordered w-full" 
              required
            />
          </div>
          
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea 
              v-model="newTask.description" 
              class="textarea textarea-bordered h-24"
            ></textarea>
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Category</span>
            </label>
            <select v-model="newTask.category_id" class="select select-bordered w-full">
              <option value="">Select Category</option>
              <template v-if="categories">
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </template>
            </select>
          </div>
          
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Priority</span>
            </label>
            <select v-model="newTask.priority" class="select select-bordered w-full">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select v-model="newTask.status" class="select select-bordered w-full">
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Due Date</span>
            </label>
            <input 
              type="datetime-local" 
              v-model="newTask.due_date" 
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Assign To</span>
            </label>
            <select v-model="newTask.assigned_to" class="select select-bordered w-full">
              <option value="">Select User</option>
              <template v-if="users">
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.username }}
                </option>
              </template>
            </select>
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Reminder Date</span>
            </label>
            <input 
              type="datetime-local" 
              v-model="newTask.reminder_date" 
              class="input input-bordered w-full"
            />
          </div>

          <button type="submit" class="btn btn-primary mt-4 w-full">Add Task</button>
        </form>
      </div>

      <!-- Tasks Table -->
      <div class="lg:col-span-2 p-4">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Category</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in tasks" :key="task.id" :class="{
                'opacity-50': task.status === 'completed',
                'bg-warning bg-opacity-10': task.status === 'in_progress',
                'bg-error bg-opacity-10': isOverdue(task)
              }">
                <td class="max-w-[200px]">
                  <input 
                    v-if="editingTask?.id === task.id"
                    v-model="editingTask.title"
                    class="input input-bordered input-sm w-full"
                  />
                  <span v-else class="block truncate">{{ task.title }}</span>
                </td>
                <td class="max-w-[300px]">
                  <textarea 
                    v-if="editingTask?.id === task.id"
                    v-model="editingTask.description"
                    class="textarea textarea-bordered textarea-sm w-full"
                  ></textarea>
                  <span v-else class="block truncate">{{ task.description }}</span>
                </td>
                <td>
                  <select 
                    v-if="editingTask?.id === task.id"
                    v-model="editingTask.category_id"
                    class="select select-bordered select-sm w-full"
                  >
                    <option value="">Select Category</option>
                    <template v-if="categories">
                      <option v-for="category in categories" :key="category.id" :value="category.id">
                        {{ category.name }}
                      </option>
                    </template>
                  </select>
                  <span v-else>{{ getCategoryName(task.category_id) }}</span>
                </td>
                <td>
                  <input 
                    v-if="editingTask?.id === task.id"
                    type="datetime-local"
                    v-model="editingTask.due_date"
                    class="input input-bordered input-sm w-full"
                  />
                  <span v-else>{{ formatDate(task.due_date) }}</span>
                </td>
                <td>
                  <select 
                    v-if="editingTask?.id === task.id"
                    v-model="editingTask.priority"
                    class="select select-bordered select-sm w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <span v-else :class="{
                    'badge badge-success': task.priority === 'low',
                    'badge badge-warning': task.priority === 'medium',
                    'badge badge-error': task.priority === 'high',
                    'badge badge-error animate-pulse': task.priority === 'urgent'
                  }">{{ task.priority }}</span>
                </td>
                <td>
                  <select 
                    v-if="editingTask?.id === task.id"
                    v-model="editingTask.status"
                    class="select select-bordered select-sm w-full"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <span v-else :class="{
                    'badge': true,
                    'badge-ghost': task.status === 'pending',
                    'badge-warning': task.status === 'in_progress',
                    'badge-success': task.status === 'completed',
                    'badge-neutral': task.status === 'archived'
                  }">{{ task.status }}</span>
                </td>
                <td>
                  <select 
                    v-if="editingTask?.id === task.id"
                    v-model="editingTask.assigned_to"
                    class="select select-bordered select-sm w-full"
                  >
                    <option value="">Select User</option>
                    <template v-if="users">
                      <option v-for="user in users" :key="user.id" :value="user.id">
                        {{ user.username }}
                      </option>
                    </template>
                  </select>
                  <span v-else>{{ getAssignedUserName(task.assigned_to) }}</span>
                </td>
                <td class="space-x-2">
                  <template v-if="editingTask?.id === task.id">
                    <div class="flex flex-col align-middle justify-center space-y-2">
                      <button @click="saveEdit" class="btn btn-success btn-sm">Save</button>
                      <button @click="cancelEdit" class="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex flex-col align-middle justify-center space-y-2">
                      <button @click="startEdit(task)" class="btn btn-info btn-sm">Edit</button>
                      <button @click="deleteTask(task.id)" class="btn btn-error btn-sm">Delete</button>
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { taskService } from '../services/taskService'
import { categoryService } from '../services/categoryService'
import { userService } from '../services/userService'

// Initialize refs with empty arrays
const tasks = ref([])
const categories = ref([])
const users = ref([])
const editingTask = ref(null)

const newTask = ref({
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  category_id: '',
  due_date: '',
  assigned_to: '',
  reminder_date: ''
})

// Load initial data
onMounted(async () => {
  try {
    console.log('Starting to load initial data...')
    // Load data sequentially to ensure categories and users are available
    const loadedCategories = await categoryService.getCategories()
    console.log('Loaded categories:', loadedCategories)
    categories.value = loadedCategories || []

    const loadedUsers = await userService.getUsers()
    console.log('Loaded users:', loadedUsers)
    users.value = loadedUsers || []

    const loadedTasks = await taskService.getTasks()
    console.log('Loaded tasks:', loadedTasks)
    tasks.value = loadedTasks || []
  } catch (error) {
    console.error('Error loading initial data:', error.response?.data || error)
    // Ensure refs are initialized even if there's an error
    categories.value = categories.value || []
    users.value = users.value || []
    tasks.value = tasks.value || []
  }
})

// Load tasks from API
const loadTasks = async () => {
  try {
    tasks.value = await taskService.getTasks()
  } catch (error) {
    console.error('Error loading tasks:', error)
  }
}

// Load categories
const loadCategories = async () => {
  try {
    console.log('Loading categories...')
    const loadedCategories = await categoryService.getCategories()
    console.log('Categories loaded:', loadedCategories)
    if (Array.isArray(loadedCategories)) {
      categories.value = loadedCategories
      console.log('Categories set to:', categories.value)
    } else {
      console.error('Loaded categories is not an array:', loadedCategories)
      categories.value = []
    }
  } catch (error) {
    console.error('Error loading categories:', error.response?.data || error)
    categories.value = []
  }
}

// Load users
const loadUsers = async () => {
  try {
    console.log('Loading users...')
    const loadedUsers = await userService.getUsers()
    console.log('Users loaded:', loadedUsers)
    if (Array.isArray(loadedUsers)) {
      users.value = loadedUsers
      console.log('Users set to:', users.value)
    } else {
      console.error('Loaded users is not an array:', loadedUsers)
      users.value = []
    }
  } catch (error) {
    console.error('Error loading users:', error.response?.data || error)
    users.value = []
  }
}

// Add new task
const addTask = async () => {
  try {
    console.log('Adding new task:', newTask.value);
    const task = await taskService.createTask(newTask.value);
    console.log('Task created successfully:', task);
    tasks.value.unshift(task);
    clearForm();
  } catch (error) {
    console.error('Error adding task:', error.response?.data || error);
  }
}

// Delete task
const deleteTask = async (taskId) => {
  try {
    await taskService.deleteTask(taskId)
    tasks.value = tasks.value.filter(task => task.id !== taskId)
  } catch (error) {
    console.error('Error deleting task:', error)
  }
}

// Start editing task
const startEdit = (task) => {
  editingTask.value = { ...task }
}

// Save edited task
const saveEdit = async () => {
  try {
    const updatedTask = await taskService.updateTask(editingTask.value.id, editingTask.value)
    const index = tasks.value.findIndex(t => t.id === editingTask.value.id)
    if (index !== -1) {
      tasks.value[index] = updatedTask
      editingTask.value = null
    }
  } catch (error) {
    console.error('Error saving task:', error)
  }
}

// Cancel editing
const cancelEdit = () => {
  editingTask.value = null
}

// Helper functions
const getCategoryName = (categoryId) => {
  if (!categories.value || !categoryId) return ''
  console.log('Getting category name for ID:', categoryId, 'from categories:', categories.value)
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : ''
}

const getAssignedUserName = (userId) => {
  if (!users.value || !userId) return ''
  const user = users.value.find(u => u.id === userId)
  return user ? user.username : ''
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const isOverdue = (task) => {
  if (!task.due_date) return false
  return new Date(task.due_date) < new Date()
}

// Clear form after adding task
const clearForm = () => {
  newTask.value = {
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    category_id: '',
    due_date: '',
    assigned_to: '',
    reminder_date: ''
  }
}
</script>