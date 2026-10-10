/**
 * Body chuẩn của mọi API — khớp common/dto/ApiResponse ở BE.
 * - Thành công: { success: true, data, status: 200, message: 'ok' }
 * - Lỗi:        { success: false, data: null, status: 4xx|5xx, message, details? }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message: string;
  details?: unknown;
}

/** Khớp PageResponse.Meta ở BE — page đánh số từ 1. */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Khớp PageResponse ở BE (nằm trong ApiResponse.data của các API phân trang). */
export interface PageResponse<T> {
  data: T[];
  meta: PageMeta;
}

/** Trang dữ liệu đã bóc khỏi ApiResponse — kiểu duy nhất component dùng cho danh sách phân trang. */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}
