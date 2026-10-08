/**
 * ApiResponse<T> - Interface chuẩn hoá cho tất cả response trả về từ API.
 * 
 * Format chuẩn:
 * - Trả về 1 object đơn:  { success: true, data: { ... }, status: 200, message: 'ok' }
 * - Trả về 1 mảng:        { success: true, data: [...], status: 200, message: 'ok' }
 * - Trả về nhiều resource: { success: true, data: { resource1: {...}, resource2: {...} }, status: 200, message: 'ok' }
 * - Trả về phân trang:    { success: true, data: [...], meta: { page, limit, total, totalPages }, status: 200, message: 'ok' }
 * - Khi có lỗi:           { success: false, data: null, status: 4xx|5xx, message: '...', details?: [...] }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message: string;
  meta?: PaginationMeta;
  details?: any;
}

export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message: string;
}


export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

