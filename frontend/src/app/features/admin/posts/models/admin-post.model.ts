export interface AdminPost {
  id: string;
  title: string;
  content?: string | null;
  author: { id: string; displayName: string; avatarUrl: string | null };
  tag: string | null;
  createdAt: string;
}

export interface AdminPostsQuery {
  search: string;
  tag?: string;
  page: number;
  limit: number;
}
