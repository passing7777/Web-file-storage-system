import request from '@/utils/request';
import type { ShareListResponse, ShareCreateResponse, ShareAccessResponse } from '@/types/share';

export const shareApi = {
  create(data: {
    fileId: number;
    password?: string;
    maxViews?: number;
    expiresIn?: number;
  }): Promise<ShareCreateResponse> {
    return request.post('/shares', data);
  },

  access(shareCode: string, password?: string): Promise<ShareAccessResponse> {
    return request.get(`/shares/${shareCode}`, { params: { password } });
  },

  download(shareCode: string, password?: string): void {
    const url = password
      ? `/api/v1/shares/${shareCode}/download?password=${encodeURIComponent(password)}`
      : `/api/v1/shares/${shareCode}/download`;
    window.open(url, '_blank');
  },

  getList(params: { page?: number; pageSize?: number }): Promise<ShareListResponse> {
    return request.get('/shares', { params });
  },

  delete(shareId: number): Promise<void> {
    return request.delete(`/shares/${shareId}`);
  },
};