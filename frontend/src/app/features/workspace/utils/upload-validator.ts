import { EditorMediaType } from '../models/editor-upload.model';

// Khớp giới hạn của UploadServiceImpl ở BE (ảnh 10 MB, âm thanh/video 100 MB)
export const UPLOAD_LIMITS = {
  image: { maxBytes: 10 * 1024 * 1024, maxMb: 10 },
  audio: { maxBytes: 100 * 1024 * 1024, maxMb: 100 },
  video: { maxBytes: 100 * 1024 * 1024, maxMb: 100 },
} as const;

export const ALLOWED_MIME_TYPES: Record<EditorMediaType, readonly string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: [
    'audio/aac',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/x-wav',
  ],
  video: ['video/mp4', 'video/ogg', 'video/quicktime', 'video/webm'],
};

export const ALLOWED_EXTENSIONS: Record<EditorMediaType, readonly string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  audio: ['.aac', '.mp3', '.m4a', '.mp4', '.ogg', '.wav', '.webm'],
  video: ['.mp4', '.ogv', '.ogg', '.mov', '.webm'],
};

/** Kiểm tra file trước khi upload; trả message lỗi để hiển thị, hoặc null nếu hợp lệ. */
export function validateUploadFile(
  file: File | null | undefined,
  mediaType: EditorMediaType,
): string | null {
  if (!file) {
    return 'Vui lòng chọn tệp.';
  }

  const limits = UPLOAD_LIMITS[mediaType];
  const allowedMimes = ALLOWED_MIME_TYPES[mediaType];
  const allowedExts = ALLOWED_EXTENSIONS[mediaType];

  const mime = file.type ? file.type.toLowerCase() : '';
  const fileName = file.name ? file.name.toLowerCase() : '';
  const extMatch = allowedExts.some((ext) => fileName.endsWith(ext));

  const typeAllowed = mime ? allowedMimes.includes(mime) || extMatch : extMatch;
  if (!typeAllowed) {
    return `Định dạng tệp không được hỗ trợ (${allowedExts.join(', ')}).`;
  }

  if (file.size > limits.maxBytes) {
    return `Tệp quá lớn (tối đa ${limits.maxMb} MB).`;
  }

  return null;
}
