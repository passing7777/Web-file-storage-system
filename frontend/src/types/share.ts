export interface Share {
  id: number;
  shareCode: string;
  fileName: string;
  fileSize: number;
  viewCount: number;
  maxViews: number;
  expiresAt: string;
  createdAt: string;
}

export interface ShareListResponse {
  items: Share[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ShareCreateResponse {
  id: number;
  shareCode: string;
  expiresAt: string;
  shareUrl: string;
}

export interface ShareAccessResponse {
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl: string;
}