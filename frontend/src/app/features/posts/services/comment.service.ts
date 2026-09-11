import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { PaginatedResult } from '../models/post.model';
import { Comment } from '../models/comment.model';

/**
 * CommentService - Dịch vụ tương tác API liên quan đến bình luận bài viết
 * 
 * Mục đích: Xử lý toàn bộ luồng tạo, đọc, cập nhật, xóa, dịch bình luận của bài viết.
 * 
 * DB: Tương tác chủ yếu với bảng `comments`. Các bình luận được tổ chức theo dạng
 * cấu trúc cây (tree) hoặc chuỗi (thread) thông qua các khóa ngoại `parent_id` (ID của comment gốc)
 * hoặc `reply_to_comment_id` (ID của comment trực tiếp được reply).
 * 
 * Các operators RxJS (`map`) được dùng để tự động biến đổi JSON payload từ API
 * thành các đối tượng `Comment` đã map sẵn trường và cấp bậc.
 */
@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly http = inject(HttpClient);

  /**
   * Hàm chuyển đổi định dạng dữ liệu trả về từ API thô (raw JSON) sang chuẩn model `Comment` ở phía Frontend.
   * Đồng thời thực hiện ánh xạ (map) thông tin tác giả và tự động gọi đệ quy để map các câu trả lời (replies).
   * 
   * DB & UI mapping:
   * - Tạo mảng `replies` đệ quy từ các bình luận có `parent_id` bằng với comment hiện tại.
   * - Map `author` để UI lấy được avatarUrl và tên hiển thị dễ dàng.
   */
  private mapComment(comment: any): Comment {
    return {
      ...comment,
      author: {
        id: comment.author.id,
        displayName: comment.author.display_name || comment.author.username || 'User',
        username: comment.author.username || 'user',
        avatarUrl: comment.author.avatar,
        role: comment.author.role_id === 1 ? 'admin' : 'member'
      } as any, // Cast to any because User model may expect other base fields like createdAt
      // Gọi đệ quy mapComment cho danh sách replies con nếu có
      replies: comment.replies ? comment.replies.map((r: any) => this.mapComment(r)) : []
    };
  }

  /**
   * Lấy danh sách bình luận gốc của một bài viết, hỗ trợ phân trang.
   * Dữ liệu Input: ID bài viết (postId), số trang (page), giới hạn số lượng (limit)
   * Dữ liệu Output: Observable của object PaginatedResult, bên trong chứa mảng các `Comment` đã được parse.
   */
  getCommentsByPost(postId: string, page: number = 1, limit: number = 20): Observable<PaginatedResult<Comment>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<any[]>>(`${environment.apiUrl}/posts/${postId}/comments`, { params })
      .pipe(map((res) => {
        // Format mới: data là mảng bình luận, meta phân trang nằm ở cùng cấp với data
        const items: any[] = Array.isArray(res.data) ? res.data : [];
        const meta = res.meta;
        return {
          items: items.map((c: any) => this.mapComment(c)),
          meta: {
            total: meta?.total ?? 0,
            page: meta?.page ?? page,
            limit: meta?.limit ?? limit,
            totalPages: meta?.totalPages ?? 1,
          }
        };
      }));
  }

  /**
   * Tạo một bình luận mới. 
   * Nếu có truyền vào `replyToCommentId`, backend sẽ lưu vào bảng comments với cột reply_to_comment_id,
   * đánh dấu đây là một phản hồi (reply) cho bình luận đó. Đồng thời gán parent_id nếu comment đó thuộc 1 thread.
   */
  createComment(postId: string, content: string, replyToCommentId?: string | number): Observable<Comment> {
    const payload: any = { content };
    if (replyToCommentId !== undefined && replyToCommentId !== null) {
      payload.reply_to_comment_id = String(replyToCommentId);
    }
    return this.http
      .post<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments`, payload)
      .pipe(map((res) => this.mapComment(res.data)));
  }

  /**
   * Cập nhật nội dung một bình luận đã tồn tại. (Edit comment)
   */
  updateComment(postId: string, commentId: string, content: string): Observable<Comment> {
    return this.http
      .patch<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments/${commentId}`, { content })
      .pipe(map((res) => this.mapComment(res.data)));
  }

  /**
   * Xóa một bình luận khỏi cơ sở dữ liệu. 
   * (Tuỳ phía Backend có thể là Hard Delete - xóa vĩnh viễn, hoặc Soft Delete - cập nhật cột deleted_at).
   */
  deleteComment(postId: string, commentId: string): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments/${commentId}`)
      .pipe(map((res) => res.data));
  }
}
