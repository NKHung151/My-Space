import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from './api-response.model';

/**
 * Message lỗi do server trả về (ApiResponse.message), hoặc '' nếu không có.
 * Lỗi mạng (status 0) hay response không phải JSON của API thì không có message.
 */
function serverMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return '';
  const body = error.error as Partial<ApiResponse<unknown>> | null | undefined;
  return typeof body?.message === 'string' ? body.message : '';
}

/**
 * Message hiển thị cho người dùng: ưu tiên message của server (BE chỉ trả message nghiệp vụ,
 * lỗi hệ thống đã được thay bằng câu chung), không có thì dùng fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  return serverMessage(error) || fallback;
}

/**
 * Message cho lỗi upload/kiểm duyệt ảnh, fallback theo HTTP status:
 * - 422: Nội dung vi phạm quy định
 * - 503: Dịch vụ kiểm duyệt tạm thời không khả dụng
 * - 413: File quá lớn
 * - 400: File không hợp lệ
 */
export function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Tải lên thất bại. Vui lòng thử lại.';
  }

  const message = serverMessage(error);
  switch (error.status) {
    case 422:
      return message || 'Ảnh vi phạm quy định cộng đồng. Vui lòng chọn ảnh khác.';
    case 503:
      return message || 'Hệ thống kiểm duyệt ảnh đang bận. Vui lòng thử lại sau.';
    case 413:
      return message || 'File quá lớn (tối đa 10 MB).';
    case 400:
      return message || 'File không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF.';
    case 401:
      return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    default:
      return message || 'Tải lên thất bại. Vui lòng thử lại.';
  }
}
