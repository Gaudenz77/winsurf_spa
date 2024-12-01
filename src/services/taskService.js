const API_URL = 'http://localhost:3000/api';

class TaskService {
  async getTasks() {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        credentials: 'include', // Important for sending cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tasks');
      }

      const data = await response.json();
      return data.tasks;
    } catch (error) {
      throw error;
    }
  }

  async createTask(task) {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create task');
      }

      const data = await response.json();
      return data.task;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update task');
      }

      const data = await response.json();
      return data.task;
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete task');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export const taskService = new TaskService();
