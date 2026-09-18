import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal, HostListener, DestroyRef, Output, EventEmitter } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../services/comment.service';
import { Comment } from '../../models/comment.model';
import { LikeService } from '../../services/like.service';
import { AuthService } from '../../../../core/auth/auth.service';

import { RouterModule, RouterLink } from '@angular/router';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { AutosizeDirective } from '../../../../shared/directives/autosize.directive';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, LocalizedDatePipe, AutosizeDirective],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.scss']
})
export class CommentSectionComponent implements OnInit, OnChanges {
  @Input({ required: true }) postId!: string;
  @Input({ required: true }) postAuthorId!: string;

  @Output() commentCountChange = new EventEmitter<number>();

  private commentService = inject(CommentService);
  private likeService = inject(LikeService);

  public authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL STATE / DB FIELD MAPPING
  // ═══════════════════════════════════════════════════════════════════════════
  
  // comments (Signal): Danh sách bình luận gốc (Root comments).
  // - map từ bảng comments có parent_id = null.
  // - Mỗi comment chứa mảng `replies` map từ các comments có parent_id = id_của_nó.
  comments = signal<Comment[]>([]);
  
  // totalComments: map từ COUNT() các records liên quan trong DB.
  totalComments = signal<number>(0);
  loading = signal<boolean>(false);
  
  // Trạng thái phân trang
  currentPage = signal<number>(1);
  hasMore = signal<boolean>(false);

  newCommentText = '';
  resetCounter = 0; // Tăng sau mỗi lần submit để trigger autosize reset
  isSubmitting = signal<boolean>(false);

  replyingStates = signal<Record<string, string>>({});
  editingStates = signal<Record<string, string>>({});
  
  commentToDelete = signal<{ comment: Comment, parent?: Comment } | null>(null);

  hasUnsavedChanges(): boolean {
    const hasNew = this.newCommentText.trim().length > 0;
    const hasReplying = Object.values(this.replyingStates()).some(text => text.trim().length > 0);
    const hasEditing = Object.values(this.editingStates()).some(text => text.trim().length > 0);
    return hasNew || hasReplying || hasEditing;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = ''; // Required for some browsers
    }
  }
  
  // Set lưu trữ ID của các bình luận đang được mở rộng (Read More)
  expandedCommentIds = signal<Set<string>>(new Set());

  toggleExpand(commentId: string): void {
    const current = this.expandedCommentIds();
    const next = new Set(current);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    this.expandedCommentIds.set(next);
  }

  isExpanded(commentId: string): boolean {
    return this.expandedCommentIds().has(commentId);
  }

  ngOnInit(): void {
    this.loadComments(1);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && !changes['postId'].isFirstChange()) {
      this.comments.set([]);
      this.loadComments(1); // Reset và load lại nếu chuyển sang bài viết khác
    }
  }


  loadComments(page: number = 1): void {
    if (page === 1) this.loading.set(true);
    this.commentService.getCommentsByPost(this.postId.toString(), page).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        if (page === 1) {
          // Trang 1: Thay thế toàn bộ mảng
          this.comments.set(res.items);
        } else {
          // Trang > 1: Lấy mảng cũ, trải nghiệm (spread) và nối kết quả mới vào cuối mảng.
          // Đây là kỹ thuật Load More (Append), giữ nguyên những gì người dùng đang xem.
          this.comments.update(prev => [...prev, ...res.items]);
        }
        this.totalComments.set(res.meta.total);
        this.currentPage.set(res.meta.page);
        this.hasMore.set(res.meta.page < res.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.loadComments(this.currentPage() + 1);
  }

  setReplyTarget(comment: Comment, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }
    this.replyingStates.update(states => ({ ...states, [comment.id]: '' }));
  }

  updateReplyingText(id: string, text: string): void {
    this.replyingStates.update(states => ({ ...states, [id]: text }));
  }

  cancelReply(id: string): void {
    this.replyingStates.update(states => {
      const newStates = { ...states };
      delete newStates[id];
      return newStates;
    });
  }

  handleCommentFocus(event: FocusEvent): void {
    if (!this.authService.isAuthenticated()) {
      (event.target as HTMLElement).blur();
      this.authModalService.open();
    }
  }

  submitComment(): void {
    const content = this.newCommentText.trim();
    if (!content) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.isSubmitting.set(true);

    this.commentService.createComment(this.postId.toString(), content).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (newComment) => {
        this.isSubmitting.set(false);
        this.newCommentText = '';
        this.resetCounter++; // Trigger autosize directive reset chiều cao textarea
        // Đẩy comment mới lên đầu mảng
        this.comments.update(prev => [newComment, ...prev]);
        this.totalComments.update(t => t + 1);
        this.commentCountChange.emit(1);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
  
  submitReply(target: Comment): void {
    const text = this.replyingStates()[target.id];
    const content = text ? text.trim() : '';
    if (!content) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.isSubmitting.set(true);

    const replyToId = target.id;

    this.commentService.createComment(this.postId.toString(), content, replyToId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (newComment) => {
        this.isSubmitting.set(false);
        this.cancelReply(target.id);
        
        // Cập nhật State UI cục bộ (Mutate array):
        this.comments.update(prev => {
          const arr = [...prev];
          const parentId = target.parentId || target.id;
          const parentIdx = arr.findIndex(c => c.id === parentId);
          if (parentIdx > -1) {
            // Cần tạo object mới (immutable) để Angular nhận diện thay đổi thay vì push trực tiếp
            const p = { ...arr[parentIdx] };
            p.replies = p.replies ? [...p.replies, newComment] : [newComment];
            arr[parentIdx] = p;
          }
          return arr;
        });
        this.totalComments.update(t => t + 1);
        this.commentCountChange.emit(1);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  toggleLike(comment: Comment): void {
    this.likeService.optimisticToggleCommentLike(
      comment,
      this.postId,
      this.authService,
      this.authModalService,
      this.destroyRef
    );
  }

  // Xóa bình luận
  deleteComment(comment: Comment, parent?: Comment): void {
    this.commentToDelete.set({ comment, parent });
    document.body.classList.add('modal-open'); // Hiển thị modal confirm
  }

  cancelDelete(): void {
    this.commentToDelete.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmDelete(): void {
    const target = this.commentToDelete();
    if (!target) return;
    const { comment, parent } = target;
    
    this.commentService.deleteComment(comment.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.cancelDelete();
        this.toastService.showSuccess('Đã xóa bình luận');
        
        let deletedCount = 1;
        
        this.comments.update(prev => {
          const arr = [...prev];
          if (parent) {
            const pIdx = arr.findIndex(c => c.id === parent.id);
            if (pIdx > -1) {
              const p = { ...arr[pIdx] };
              if (p.replies) {
                p.replies = p.replies.filter(r => r.id !== comment.id);
              }
              arr[pIdx] = p;
            }
            return arr;
          }
          
          // Nếu xóa root comment thì đếm số lượng replies bị xóa theo
          const targetRoot = arr.find(c => c.id === comment.id);
          if (targetRoot && targetRoot.replies) {
            deletedCount += targetRoot.replies.length;
          }
          return arr.filter(c => c.id !== comment.id);
        });
        this.totalComments.update(t => t - deletedCount);
        this.commentCountChange.emit(-deletedCount);
      },
      error: () => {
        this.cancelDelete();
      }
    });
  }

  // Bắt đầu chỉnh sửa bình luận
  setEditTarget(comment: Comment, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingStates.update(states => ({ ...states, [comment.id]: comment.content }));
  }

  updateEditingText(id: string, text: string): void {
    this.editingStates.update(states => ({ ...states, [id]: text }));
  }

  cancelEdit(id: string): void {
    this.editingStates.update(states => {
      const newStates = { ...states };
      delete newStates[id];
      return newStates;
    });
  }

  saveEdit(comment: Comment, parent?: Comment): void {
    const text = this.editingStates()[comment.id];
    const content = text ? text.trim() : '';
    if (!content || content === comment.content) {
      this.cancelEdit(comment.id);
      return;
    }
    this.isSubmitting.set(true);
    this.commentService.updateComment(comment.id, content).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (updatedComment) => {
        this.isSubmitting.set(false);
        this.cancelEdit(comment.id);
        // Cập nhật lại UI sau khi sửa thành công bằng cách tạo object mới (Immutable)
        this.comments.update(prev => {
          const arr = [...prev];
          if (parent) {
            const pIdx = arr.findIndex(c => c.id === parent.id);
            if (pIdx > -1) {
              const p = { ...arr[pIdx] };
              if (p.replies) {
                const rIdx = p.replies.findIndex(x => x.id === comment.id);
                if (rIdx > -1) {
                  p.replies = [...p.replies];
                  p.replies[rIdx] = { ...p.replies[rIdx], ...updatedComment };
                }
              }
              arr[pIdx] = p;
            }
          } else {
            const rIdx = arr.findIndex(c => c.id === comment.id);
            if (rIdx > -1) {
              // Phải giữ lại array replies cũ vì API cập nhật có thể không trả về replies
              arr[rIdx] = { 
                ...arr[rIdx], 
                ...updatedComment,
                replies: arr[rIdx].replies,
                likeCount: arr[rIdx].likeCount !== undefined ? arr[rIdx].likeCount : updatedComment.likeCount,
                liked: arr[rIdx].liked !== undefined ? arr[rIdx].liked : updatedComment.liked
              };
            }
          }
          return arr;
        });
      }
    });
  }

  canEdit(comment: Comment): boolean {
    return !!comment.permissions?.canEdit;
  }

  isPostAuthor(comment: Comment): boolean {
    const authorId = comment.author?.id;
    return String(authorId) === String(this.postAuthorId);
  }

  isCommentEdited(comment: Comment): boolean {
    if (!comment.updatedAt || !comment.createdAt) return false;
    const diff = Math.abs(new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime());
    // Xem như đã chỉnh sửa nếu thời gian chênh lệch lớn hơn 1 giây (1000ms)
    // để tránh lỗi nanosecond khác biệt khi Java gọi LocalDateTime.now() 2 lần.
    return diff > 1000;
  }

  canDelete(comment: Comment): boolean {
    return !!comment.permissions?.canDelete;
  }
}
