import { HttpErrorResponse } from '@angular/common/http';

type ErrorPayload = {
  message?: string | string[];
  meta?: {
    error?: {
      message?: string | string[];
    };
  };
};

export function getApiErrorMessage(error: unknown, fallback: string, preferFallback = false): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (preferFallback) return fallback;

  const payload = error.error as ErrorPayload | null | undefined;
  const message = payload?.meta?.error?.message ?? payload?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  return message || error.message || fallback;
}

/**
 * Trích xuất message từ lỗi API liên quan đến upload/moderation.
 * Trả về message thân thiện theo loại HTTP status:
 * - 422: Nội dung vi phạm quy định AI
 * - 503: AI service tạm thời không khả dụng
 * - 413: Ảnh quá lớn
 * - 400: File không hợp lệ
 */
export function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Tải lên thất bại. Vui lòng thử lại.';
  }

  const payload = error.error as ErrorPayload | null | undefined;
  const serverMessage = payload?.meta?.error?.message ?? payload?.message;
  const rawMessage = Array.isArray(serverMessage) ? serverMessage.join(' ') : (serverMessage ?? '');

  switch (error.status) {
    case 422:
      return rawMessage || 'Ảnh vi phạm quy định cộng đồng. Vui lòng chọn ảnh khác.';
    case 503:
      return rawMessage || 'Hệ thống kiểm duyệt ảnh đang bận. Vui lòng thử lại sau.';
    case 413:
      return rawMessage || 'File quá lớn (tối đa 10 MB).';
    case 400:
      return rawMessage || 'File không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF.';
    case 401:
      return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    default:
      return rawMessage || 'Tải lên thất bại. Vui lòng thử lại.';
  }
}

