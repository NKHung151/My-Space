
export type EditorMediaType = 'image' | 'audio' | 'video';

export interface UploadResponse {
  mediaId: string;
  url: string;
  mimeType: string;
  mediaType: EditorMediaType;
}
