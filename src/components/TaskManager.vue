<template>
  <div class="bg-base-200 rounded-lg shadow-lg">
    <!-- Grid layout for form and table -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Task Form - takes 1/3 of space on large screens -->
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
              <span class="label-text">Priority</span>
            </label>
            <select v-model="newTask.priority" class="select select-bordered w-full">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary mt-4 w-full">Add Task</button>
        </form>
      </div>

      <!-- Tasks Table - takes 2/3 of space on large screens -->
      <div class="lg:col-span-2 p-4">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th class="w-1/4">Title</th>
                <th class="w-1/3">Description</th>
                <th class="w-1/6">Priority</th>
                <th class="w-1/12">Status</th>
                <th class="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in tasks" :key="task.id" :class="{'opacity-50': task.completed}">
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
                    v-model="editingTask.priority"
                    class="select select-bordered select-sm w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <span v-else :class="{
                    'text-success': task.priority === 'low',
                    'text-warning': task.priority === 'medium',
                    'text-error': task.priority === 'high'
                  }">{{ task.priority }}</span>
                </td>
                <td>
                  <input 
                    type="checkbox" 
                    :checked="task.completed"
                    @change="toggleTaskStatus(task.id)"
                    class="checkbox"
                  />
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

const tasks = ref([])
const editingTask = ref(null)
const newTask = ref({
  title: '',
  description: '',
  priority: 'medium'
})

// Load tasks from API
const loadTasks = async () => {
  try {
    tasks.value = await taskService.getTasks()
  } catch (error) {
    console.error('Error loading tasks:', error)
  }
}

// Add new task
const addTask = async () => {
  try {
    const task = await taskService.createTask({
      title: newTask.value.title,
      description: newTask.value.description,
      priority: newTask.value.priority
    })
    
    tasks.value.push(task)
    
    // Reset form
    newTask.value = {
      title: '',
      description: '',
      priority: 'medium'
    }
  } catch (error) {
    console.error('Error adding task:', error)
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

// Toggle task status
const toggleTaskStatus = async (taskId) => {
  try {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      const updatedTask = await taskService.updateTask(taskId, {
        ...task,
        completed: !task.completed
      })
      Object.assign(task, updatedTask)
    }
  } catch (error) {
    console.error('Error updating task status:', error)
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

// Initialize tasks on component mount
onMounted(() => {
  loadTasks()
})
</script>
