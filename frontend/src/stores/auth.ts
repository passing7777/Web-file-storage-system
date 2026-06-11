import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { LoginRequest, RegisterRequest, User } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(data: LoginRequest) {
    const response = await authApi.login(data);
    token.value = response.accessToken;
    user.value = response.user;
    localStorage.setItem('token', response.accessToken);
    return response;
  }

  async function register(data: RegisterRequest) {
    const response = await authApi.register(data);
    return response;
  }

  async function logout() {
    await authApi.logout();
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  }

  async function fetchProfile() {
    const response = await authApi.getProfile();
    user.value = response;
    return response;
  }

  function init() {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      token.value = savedToken;
      fetchProfile().catch(() => {
        token.value = null;
        localStorage.removeItem('token');
      });
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    logout,
    fetchProfile,
    init,
  };
});