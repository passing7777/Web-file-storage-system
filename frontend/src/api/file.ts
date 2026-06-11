import request from '@/utils/request';
import type { FileListResponse, FileUploadResponse } from '@/types/file';

export const fileApi = {
  upload(file: File, onProgress?: (progress: number) => void): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return request.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  download(fileId: number): void {
    window.open(`/api/v1/files/download/${fileId}`, '_blank');
  },

  getList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FileListResponse> {
    return request.get('/files/list', { params });
  },

  delete(fileId: number): Promise<void> {
    return request.delete(`/files/${fileId}`);
  },

  rename(fileId: number, newName: string): Promise<void> {
    return request.put(`/files/${fileId}/rename`, { newName });
  },

  getTrashList(params: { page?: number; pageSize?: number }): Promise<FileListResponse> {
    return request.get('/files/trash', { params });
  },

  restore(fileId: number): Promise<void> {
    return request.post(`/files/trash/${fileId}/restore`);
  },

  permanentDelete(fileId: number): Promise<void> {
    return request.delete(`/files/trash/${fileId}`);
  },
};