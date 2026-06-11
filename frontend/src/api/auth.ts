import request from '@/utils/request';
import type { LoginRequest, RegisterRequest, LoginResponse, User } from '@/types/auth';

export const authApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return request.post('/auth/login', data);
  },

  register(data: RegisterRequest): Promise<User> {
    return request.post('/auth/register', data);
  },

  logout(): Promise<void> {
    return request.post('/auth/logout');
  },

  getProfile(): Promise<User> {
    return request.get('/auth/profile');
  },

  updateEmail(email: string): Promise<User> {
    return request.put('/users/profile', { email });
  },

  updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    return request.put('/users/profile', { oldPassword, newPassword });
  },
};