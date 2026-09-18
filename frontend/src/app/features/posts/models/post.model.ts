import { User } from '../../users/models/user.model';

// ─── Kết quả phân trang chung ───────────────────────────────────────────────
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

// ─── Model bài viết (dùng cho cả danh sách lẫn chi tiết) ─────────────────────
// List API (PostResponse): content = null/undefined
// Detail API (PostDetailResponse): content = string
export interface Post {
  id: number;
  authorId: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content?: string | null;          // Chỉ có trong detail API
  coverImageUrl?: string | null;
  hasVideo?: boolean;
  coverVideoUrl?: string | null;
  tag: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  author: User;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;        // Chỉ có trong detail API

  // Trạng thái UI (không có trong DB)
  liked?: boolean;
  isLiking?: boolean;
}

// ─── Payload tạo / cập nhật bài viết ─────────────────────────────────────────
export interface CreatePostPayload {
  title: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  hasVideo?: boolean;
  tag?: string;
  publish?: boolean;
}

export type UpdatePostPayload = Partial<CreatePostPayload>;
