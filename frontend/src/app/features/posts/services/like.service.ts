import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal, DestroyRef, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { unwrap } from '../../../core/http/api.operators';
import { Post } from '../models/post.model';
import { Comment } from '../models/comment.model';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthModalService } from '../../../core/auth/auth-modal.service';

export interface LikeToggleResponse {
  liked: boolean;
  likeCount: number;
}

@Injectable({ providedIn: 'root' })
export class LikeService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);

  togglePostLike(postId: number | string, isCurrentlyLiked: boolean): Observable<LikeToggleResponse> {
    return this.toggle(`${environment.apiUrl}/posts/${postId}/like`, isCurrentlyLiked);
  }

  toggleCommentLike(postId: number | string, commentId: number | string, isCurrentlyLiked: boolean): Observable<LikeToggleResponse> {
    return this.toggle(`${environment.apiUrl}/posts/${postId}/comments/${commentId}/like`, isCurrentlyLiked);
  }

  /** Like/bỏ like bài viết: cập nhật UI ngay, đồng bộ theo server khi có kết quả, hoàn tác nếu lỗi. */
  optimisticTogglePostLike<T extends Post>(postSignal: WritableSignal<T | null>, destroyRef?: DestroyRef): void {
    const p = postSignal();
    if (!p || p.isLiking || !this.ensureAuthenticated()) return;

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

  /** Như optimisticTogglePostLike nhưng sửa trực tiếp object bình luận đang hiển thị. */
  optimisticToggleCommentLike(comment: Comment, postId: number | string, destroyRef?: DestroyRef): void {
    if (comment.isLiking || !this.ensureAuthenticated()) return;

    const previousLiked = comment.liked === true;
    const previousLikeCount = comment.likeCount ?? 0;
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    comment.liked = nextLiked;
    comment.likeCount = nextLikeCount;
    comment.isLiking = true;

    let req = this.toggleCommentLike(postId, comment.id, previousLiked);
    if (destroyRef) {
      req = req.pipe(takeUntilDestroyed(destroyRef));
    }

    req.subscribe({
      next: (res) => {
        comment.liked = res.liked;
        comment.likeCount = res.likeCount;
        comment.isLiking = false;
      },
      error: () => {
        comment.liked = previousLiked;
        comment.likeCount = previousLikeCount;
        comment.isLiking = false;
      }
    });
  }

  private toggle(url: string, isCurrentlyLiked: boolean): Observable<LikeToggleResponse> {
    const req = isCurrentlyLiked
      ? this.http.delete<ApiResponse<LikeToggleResponse>>(url)
      : this.http.post<ApiResponse<LikeToggleResponse>>(url, {});
    return req.pipe(unwrap());
  }

  private ensureAuthenticated(): boolean {
    if (this.authService.isAuthenticated()) return true;
    this.authModalService.open();
    return false;
  }
}
