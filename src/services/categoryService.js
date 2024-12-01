import axios from 'axios'

const API_URL = 'http://localhost:3000'

class CategoryService {
  async getCategories() {
    try {
      const response = await axios.get(`${API_URL}/api/categories`, {
        withCredentials: true
      })
      return response.data.categories
    } catch (error) {
      console.error('Error fetching categories:', error)
      return [] // Return empty array instead of throwing
    }
  }

  async createCategory(categoryData) {
    try {
      const response = await axios.post(`${API_URL}/api/categories`, categoryData, {
        withCredentials: true
      })
      return response.data.category
    } catch (error) {
      console.error('Error creating category:', error)
      throw error
    }
  }

  async updateCategory(categoryId, categoryData) {
    try {
      const response = await axios.put(`${API_URL}/api/categories/${categoryId}`, categoryData, {
        withCredentials: true
      })
      return response.data.category
    } catch (error) {
      console.error('Error updating category:', error)
      throw error
    }
  }

  async deleteCategory(categoryId) {
    try {
      await axios.delete(`${API_URL}/api/categories/${categoryId}`, {
        withCredentials: true
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      throw error
    }
  }
}

export const categoryService = new CategoryService()
