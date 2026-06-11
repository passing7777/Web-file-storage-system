import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    return response.data.data;
  },
  (error) => {
    const { response } = error;

    if (response) {
      const { status, data } = response;

      if (status === 401) {
        const authStore = useAuthStore();
        authStore.logout();
        router.push({ name: 'Login' });
        ElMessage.error('登录已过期，请重新登录');
      } else if (status === 403) {
        ElMessage.error('没有权限访问');
      } else if (status === 404) {
        ElMessage.error(data.message || '资源不存在');
      } else if (status === 409) {
        ElMessage.error(data.message || '资源冲突');
      } else if (status === 410) {
        ElMessage.error(data.message || '资源已过期');
      } else {
        ElMessage.error(data.message || '请求失败');
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

export default request;