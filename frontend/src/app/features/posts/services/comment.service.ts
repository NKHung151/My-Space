import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { PaginatedResult } from '../models/post.model';
import { Comment } from '../models/comment.model';

/**
 * CommentService — Tương tác API cho bình luận bài viết.
 * Tất cả field author trong response từ BE dùng camelCase (avatarUrl, displayName, role).
 */
@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);

  /** Map raw JSON từ BE sang Comment model */
  private mapComment(raw: any): Comment {
    return {
      ...raw,
      author: {
        id: raw.author.id,
        displayName: raw.author.displayName || raw.author.username || 'User',
        username: raw.author.username || 'user',
        avatarUrl: raw.author.avatarUrl ?? null,
        role: raw.author.role ?? 'user',
      } as any,
      replies: raw.replies ? raw.replies.map((r: any) => this.mapComment(r)) : [],
    };
  }

  /** Lấy danh sách bình luận gốc của bài viết (có phân trang) */
  getCommentsByPost(postId: string, page = 1, limit = 20): Observable<PaginatedResult<Comment>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<any>>(
        `${environment.apiUrl}/posts/${postId}/comments`,
        { params }
      )
      .pipe(map((res) => {
        const items: any[] = Array.isArray(res.data) ? res.data : [];
        const meta = (res as any).meta;
        return {
          items: items.map((c) => this.mapComment(c)),
          meta: {
            total: meta?.total ?? 0,
            page: meta?.page ?? page,
            limit: meta?.limit ?? limit,
            totalPages: meta?.totalPages ?? 1,
          },
        };
      }));
  }

  /** Tạo bình luận mới (hoặc reply nếu truyền replyToCommentId) */
  createComment(postId: string, content: string, replyToCommentId?: string | number): Observable<Comment> {
    const payload: Record<string, any> = { content };
    if (replyToCommentId != null) {
      payload['replyToCommentId'] = String(replyToCommentId);
    }
    return this.http
      .post<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments`, payload)
      .pipe(map((res) => this.mapComment(res.data)));
  }

  /** Sửa nội dung bình luận */
  updateComment(postId: string, commentId: string, content: string): Observable<Comment> {
    return this.http
      .patch<ApiResponse<any>>(
        `${environment.apiUrl}/posts/${postId}/comments/${commentId}`,
        { content }
      )
      .pipe(map((res) => this.mapComment(res.data)));
  }

  /** Xóa bình luận */
  deleteComment(postId: string, commentId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(
        `${environment.apiUrl}/posts/${postId}/comments/${commentId}`
      )
      .pipe(map(() => undefined));
  }
}
