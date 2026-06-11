export interface User {
  id: number;
  username: string;
  email?: string;
  status: string;
  storageLimit: number;
  usedStorage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}