import { EditorMediaType } from '../models/editor-upload.model';

export const UPLOAD_LIMITS = {
  image: { maxBytes: 5 * 1024 * 1024, maxMb: 5 },
  audio: { maxBytes: 25 * 1024 * 1024, maxMb: 25 },
  video: { maxBytes: 95 * 1024 * 1024, maxMb: 95 },
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

export interface FileValidationResult {
  valid: boolean;
  errorKey?: string;
  params?: Record<string, string | number>;
}

export function validateUploadFile(
  file: File | null | undefined,
  mediaType: EditorMediaType,
): FileValidationResult {
  if (!file) {
    return { valid: false, errorKey: 'file_required' };
  }

  const limits = UPLOAD_LIMITS[mediaType];
  const allowedMimes = ALLOWED_MIME_TYPES[mediaType];
  const allowedExts = ALLOWED_EXTENSIONS[mediaType];

  const mime = file.type ? file.type.toLowerCase() : '';
  const fileName = file.name ? file.name.toLowerCase() : '';
  const extMatch = allowedExts.some((ext) => fileName.endsWith(ext));

  if (mime) {
    if (!allowedMimes.includes(mime) && !extMatch) {
      return { valid: false, errorKey: 'invalid_file_type' };
    }
  } else if (!extMatch) {
    return { valid: false, errorKey: 'invalid_file_type' };
  }

  if (file.size > limits.maxBytes) {
    return {
      valid: false,
      errorKey: 'file_too_large',
      params: { maxSize: limits.maxMb },
    };
  }

  return { valid: true };
}
