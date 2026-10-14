import { apiClient } from './apiClient';

export const authService = {
  async register(payload) {
    const res = await apiClient.request('/auth/register', {
      method: 'POST',
      data: payload
    });
    return res.data;
  },

  async login(email, password) {
    const res = await apiClient.request('/auth/login', {
      method: 'POST',
      data: { email, password }
    });
    return res.data;
  },

  async logout() {
    try {
      await apiClient.request('/auth/logout', { method: 'POST' });
    } finally {
      apiClient.clearToken();
    }
  },

  async getMe() {
    const res = await apiClient.request('/auth/me', { method: 'GET' });
    return res.data;
  },

  async updateProfile(profileData) {
    const res = await apiClient.request('/auth/profile', {
      method: 'PUT',
      data: profileData
    });
    return res.data;
  },

  async changePassword(currentPassword, newPassword) {
    const res = await apiClient.request('/auth/change-password', {
      method: 'PUT',
      data: { currentPassword, newPassword }
    });
    return res;
  }
};
