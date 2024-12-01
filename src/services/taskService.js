import axios from 'axios';

const API_URL = 'http://localhost:3000';

class TaskService {
  async getTasks() {
    try {
      const response = await axios.get(`${API_URL}/api/tasks`, {
        withCredentials: true,
      });
      return response.data.tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return []; // Return empty array on error
    }
  }

  async createTask(task) {
    try {
      // Format dates before sending
      const taskData = {
        ...task,
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
        reminder_date: task.reminder_date ? new Date(task.reminder_date).toISOString() : null
      };

      const response = await axios.post(`${API_URL}/api/tasks`, taskData, {
        withCredentials: true,
      });
      return response.data.task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      // Format dates before sending
      const updateData = {
        ...updates,
        due_date: updates.due_date ? new Date(updates.due_date).toISOString() : null,
        reminder_date: updates.reminder_date ? new Date(updates.reminder_date).toISOString() : null
      };

      const response = await axios.put(`${API_URL}/api/tasks/${taskId}`, updateData, {
        withCredentials: true,
      });
      return response.data.task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      await axios.delete(`${API_URL}/api/tasks/${taskId}`, {
        withCredentials: true,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async getTasksByCategory(categoryId) {
    try {
      const response = await axios.get(`${API_URL}/api/tasks/category/${categoryId}`, {
        withCredentials: true,
      });
      return response.data.tasks;
    } catch (error) {
      console.error('Error fetching tasks by category:', error);
      return []; // Return empty array on error
    }
  }

  async getTasksByAssignee(userId) {
    try {
      const response = await axios.get(`${API_URL}/api/tasks/assigned/${userId}`, {
        withCredentials: true,
      });
      return response.data.tasks;
    } catch (error) {
      console.error('Error fetching tasks by assignee:', error);
      return []; // Return empty array on error
    }
  }

  async getOverdueTasks() {
    try {
      const response = await axios.get(`${API_URL}/api/tasks/overdue`, {
        withCredentials: true,
      });
      return response.data.tasks;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      return []; // Return empty array on error
    }
  }
}

export const taskService = new TaskService();
