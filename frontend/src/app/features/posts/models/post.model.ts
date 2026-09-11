import { User } from '../../users/models/user.model';

/**
 * Post and AuthorPost models.
 */


export interface AuthorPost {
  id: string;
  authorId: string;
  tag: string | null;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  slug: string | null;
  content: string | null;
}

export interface PublicPost extends AuthorPost {
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  likeCount: number;
  commentCount: number;
}

export interface CreatePostPayload {
  title: string;
  tag?: string;
  content: string;
}

export type UpdatePostPayload = Partial<CreatePostPayload>;

export interface PostListParams {
  search?: string;
  authorId?: string;
  tag?: string;
  page?: number;
  limit?: number;
}



export interface Post {
  id: string;
  authorId: string;
  tag: string | null;
  title: string;
  contentHtml: string;
  excerpt?: string;
  slug?: string;
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  viewCount: number; 
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  isLiking?: boolean; 
  author: User;

  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
