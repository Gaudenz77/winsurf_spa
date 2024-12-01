import axios from 'axios'

const API_URL = 'http://localhost:3000'

class CategoryService {
  async getCategories() {
    try {
      console.log('Fetching categories from:', `${API_URL}/api/categories`);
      const response = await axios.get(`${API_URL}/api/categories`, {
        withCredentials: true
      });
      console.log('Categories response:', response.data);
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error.response?.data || error);
      return [] // Return empty array instead of throwing
    }
  }

  async createCategory(categoryData) {
    try {
      console.log('Creating category at:', `${API_URL}/api/categories`);
      console.log('Category data:', categoryData);
      const response = await axios.post(`${API_URL}/api/categories`, categoryData, {
        withCredentials: true
      });
      console.log('Category response:', response.data);
      return response.data.category
    } catch (error) {
      console.error('Error creating category:', error.response?.data || error);
      throw error
    }
  }

  async updateCategory(categoryId, categoryData) {
    try {
      console.log('Updating category at:', `${API_URL}/api/categories/${categoryId}`);
      console.log('Category data:', categoryData);
      const response = await axios.put(`${API_URL}/api/categories/${categoryId}`, categoryData, {
        withCredentials: true
      });
      console.log('Category response:', response.data);
      return response.data.category
    } catch (error) {
      console.error('Error updating category:', error.response?.data || error);
      throw error
    }
  }

  async deleteCategory(categoryId) {
    try {
      console.log('Deleting category at:', `${API_URL}/api/categories/${categoryId}`);
      await axios.delete(`${API_URL}/api/categories/${categoryId}`, {
        withCredentials: true
      });
      console.log('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error.response?.data || error);
      throw error
    }
  }
}

export const categoryService = new CategoryService()
