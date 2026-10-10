import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, Page, PageResponse } from '../../../core/http/api-response.model';
import { unwrap, unwrapPage } from '../../../core/http/api.operators';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);

  getCommentsByPost(postId: string, page = 1, limit = 20): Observable<Page<Comment>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<PageResponse<Comment>>>(`${environment.apiUrl}/posts/${postId}/comments`, { params })
      .pipe(unwrapPage());
  }

  // Tạo bình luận mới (hoặc reply nếu truyền replyToCommentId)
  createComment(postId: string, content: string, replyToCommentId?: string | number): Observable<Comment> {
    const payload: { content: string; replyToCommentId?: number } = { content };
    if (replyToCommentId != null) {
      payload.replyToCommentId = Number(replyToCommentId);
    }
    return this.http
      .post<ApiResponse<Comment>>(`${environment.apiUrl}/posts/${postId}/comments`, payload)
      .pipe(unwrap());
  }

  // Sửa nội dung bình luận
  updateComment(commentId: number, content: string): Observable<Comment> {
    return this.http
      .patch<ApiResponse<Comment>>(`${environment.apiUrl}/comments/${commentId}`, { content })
      .pipe(unwrap());
  }

  // Xóa bình luận
  deleteComment(commentId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/comments/${commentId}`)
      .pipe(unwrap());
  }
}
