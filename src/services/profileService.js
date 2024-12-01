const API_URL = 'http://localhost:3000/api';

class ProfileService {
  async uploadProfileImage(file) {
    try {
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await fetch(`${API_URL}/profile/upload-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload profile image');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getProfileImage() {
    try {
      const response = await fetch(`${API_URL}/profile/image`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get profile image');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  getImageUrl(relativePath) {
    if (!relativePath) return null;
    return `${API_URL}/${relativePath}`;
  }
}

export const profileService = new ProfileService();
