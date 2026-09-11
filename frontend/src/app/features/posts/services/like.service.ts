import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal, DestroyRef } from '@angular/core';
import { Observable, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { Post } from '../models/post.model';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthModalService } from '../../../core/auth/auth-modal.service';

export interface LikeToggleResponse {
  liked: boolean;
  likeCount: number;
}

/**
 * LikeService - Service xử lý tính năng thích (like) bài viết và bình luận
 * 
 * Mục đích: Nơi tập trung logic gọi HTTP Requests để xác nhận "like" hoặc "unlike" 1 post hoặc comment.
 * DB: Tương tác trực tiếp với bảng trung gian `post_likes` hoặc `comment_likes` 
 * (lưu user_id và post_id/comment_id) để đánh dấu user đã like hay chưa, tránh tình trạng duplicate (like 2 lần).
 * Nếu đã có bản ghi trong bảng tương ứng thì nút Like sẽ hiển thị là đã thích (liked=true).
 */
@Injectable({ providedIn: 'root' })
export class LikeService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Toggle (Bật/Tắt) trạng thái like của bài viết.
   * 
   * Tại sao service này CHỈ gọi HTTP API mà không tự thực hiện việc cập nhật state UI (Optimistic update)?
   * - Vì nguyên tắc thiết kế Single Responsibility (Đơn trách nhiệm). Service chỉ đóng vai trò Data Access (cung cấp Data từ server).
   * - Quản lý State UI (số like nhấp nháy, đổi icon trái tim đỏ) là TRÁCH NHIỆM CỦA COMPONENT.
   * - Component sẽ tự "lừa" người dùng bằng cách đổi màu tim + tăng likeCount ngay khi click, 
   *   sau đó gọi hàm togglePostLike này ngầm ở dưới. Khi service gọi thành công, Component dùng kết quả trả về {liked, likeCount} 
   *   để đồng bộ lại state chính thức. Nếu service gọi thất bại, component tự roll-back trạng thái (thụt like xuống).
   * 
   * RxJS: Sử dụng operator `map` để lấy thuộc tính `data` từ API wrapper.
   */
  togglePostLike(postId: string, isCurrentlyLiked: boolean): Observable<LikeToggleResponse> {
    if (isCurrentlyLiked) {
      return this.http
        .delete<ApiResponse<LikeToggleResponse>>(
          `${environment.apiUrl}/posts/${postId}/like`
        )
        .pipe(map((res) => res.data));
    }
    return this.http
      .post<ApiResponse<LikeToggleResponse>>(
        `${environment.apiUrl}/posts/${postId}/like`,
        {}
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Tiện ích dùng chung để thực hiện Optimistic Update cho bài viết.
   * Cập nhật tín hiệu (Signal) bài viết ngay lập tức trên UI và gọi API ngầm.
   */
  optimisticTogglePostLike(
    postSignal: WritableSignal<Post | null>,
    authService: AuthService,
    authModalService: AuthModalService,
    destroyRef?: DestroyRef
  ): void {
    const p = postSignal();
    if (!p || p.isLiking) return;

    if (!authService.isAuthenticated()) {
      authModalService.open();
      return;
    }

    const previousLiked = p.liked === true;
    const previousLikeCount = p.likeCount ?? 0;
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    postSignal.set({ ...p, liked: nextLiked, likeCount: nextLikeCount, isLiking: true });

    let req = this.togglePostLike(p.id, previousLiked);
    if (destroyRef) {
      req = req.pipe(takeUntilDestroyed(destroyRef));
    }

    req.subscribe({
      next: (status) => {
        const current = postSignal();
        if (current && current.id === p.id) {
          postSignal.set({ ...current, liked: status.liked, likeCount: status.likeCount, isLiking: false });
        }
      },
      error: () => {
        const current = postSignal();
        if (current && current.id === p.id) {
          postSignal.set({ ...current, liked: previousLiked, likeCount: previousLikeCount, isLiking: false });
        }
      }
    });
  }

  /**
   * Toggle (Bật/Tắt) trạng thái like của một bình luận trong bài viết.
   * Tương tự như hàm trên, Service chỉ gọi API. Việc chặn double click hay fake delay 
   * làm mượt UI đều diễn ra trên Component.
   * DB: API này gọi vào BE để check và cập nhật trên bảng `comment_likes`.
   */
  toggleCommentLike(postId: string, commentId: string, isCurrentlyLiked: boolean): Observable<LikeToggleResponse> {
    if (isCurrentlyLiked) {
      return this.http
        .delete<ApiResponse<LikeToggleResponse>>(
          `${environment.apiUrl}/posts/${postId}/comments/${commentId}/like`
        )
        .pipe(map((res) => res.data));
    }
    return this.http
      .post<ApiResponse<LikeToggleResponse>>(
        `${environment.apiUrl}/posts/${postId}/comments/${commentId}/like`,
        {}
      )
      .pipe(map((res) => res.data));
  }
}
