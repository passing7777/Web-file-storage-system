export interface File {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface FileListResponse {
  items: File[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FileUploadResponse {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}