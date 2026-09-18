import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { PaginatedResult } from '../models/post.model';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);

  getCommentsByPost(postId: string, page = 1, limit = 20): Observable<PaginatedResult<Comment>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<any>>(
        `${environment.apiUrl}/posts/${postId}/comments`,
        { params }
      )
      .pipe(map((res) => {
        const data = res.data;
        return {
          items: data?.items || [],
          meta: {
            total: data?.meta?.totalElements ?? 0,
            page: data?.meta?.currentPage ?? page,
            limit: data?.meta?.pageSize ?? limit,
            totalPages: data?.meta?.totalPages ?? 1,
          },
        };
      }));
  }

  // Lấy danh sách các câu trả lời (replies) của một bình luận
  getReplies(commentId: string): Observable<Comment[]> {
    return this.http
      .get<ApiResponse<Comment[]>>(`${environment.apiUrl}/comments/${commentId}/replies`)
      .pipe(map(res => res.data || []));
  }

  // Tạo bình luận mới (hoặc reply nếu truyền replyToCommentId/parentId)
  createComment(postId: string, content: string, parentId?: string | number, replyToCommentId?: string | number): Observable<Comment> {
    const payload: Record<string, any> = { content };
    if (parentId != null) {
      payload['parentId'] = Number(parentId);
    }
    if (replyToCommentId != null) {
      payload['replyToCommentId'] = Number(replyToCommentId);
    }
    return this.http
      .post<ApiResponse<Comment>>(`${environment.apiUrl}/posts/${postId}/comments`, payload)
      .pipe(map((res) => res.data));
  }

  // Sửa nội dung bình luận
  updateComment(commentId: string, content: string): Observable<Comment> {
    return this.http
      .patch<ApiResponse<Comment>>(
        `${environment.apiUrl}/comments/${commentId}`,
        { content }
      )
      .pipe(map((res) => res.data));
  }

  // Xóa bình luận
  deleteComment(commentId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(
        `${environment.apiUrl}/comments/${commentId}`
      )
      .pipe(map(() => undefined));
  }
}
