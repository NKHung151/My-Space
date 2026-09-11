import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, computed, inject, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

import { Post } from '../../models/post.model';
import { LikeService } from '../../services/like.service';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

/**
 * PostCardComponent - Component tái sử dụng hiển thị thẻ bài viết tóm tắt
 * 
 * Component này nhận đầu vào là một object Post và render ra giao diện thẻ (card).
 * Bao gồm ảnh bìa, tiêu đề, tác giả, đoạn trích ngắn (excerpt),
 * cùng các thống kê cơ bản như lượt thích, lượt xem, lượt bình luận.
 */
@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, LocalizedDatePipe],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent implements OnDestroy, AfterViewInit {

  private readonly likeService = inject(LikeService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly sanitizer = inject(DomSanitizer);

  // Signal chứa dữ liệu bài viết hiện tại của card
  private _post = signal<Post>({} as Post);
  
  /** 
   * @Input post: Nhận dữ liệu bài viết từ component cha (Feed, Trang cá nhân, Bảng tin bạn bè...).
   * Thông qua setter để cập nhật signal `_post`.
   * 
   * Giải thích từng field trong object `post` được hiển thị ở đâu trong UI và lấy từ DB như thế nào:
   * - `post.title`: Tiêu đề bài viết.
   * - `post.coverImageUrl`: Ảnh bìa của bài viết (được BE parse tự động từ nội dung HTML của `post_translations.content` để trích xuất thẻ <img> đầu tiên).
   * - `post.viewCount`: Số lượt xem, map trực tiếp từ cột `posts.view_count` trong cơ sở dữ liệu.
   * - `post.likeCount`: Số lượt thích, map trực tiếp từ cột `posts.like_count`.
   * - `post.commentCount`: Số lượng bình luận, map trực tiếp từ cột `posts.comment_count`.
   * - `post.author.name`: Tên tác giả hiển thị. Lấy từ bảng `users`, cụ thể là lấy `users.display_name` nếu có, nếu không sẽ fallback về `users.username`.
   * - `post.author.avatarUrl`: Ảnh đại diện của tác giả. Map từ cột `users.avatar` trong DB.
   */
  @Input({ required: true })
  set post(value: Post) {
    this._post.set(value);
  }
  get post(): Post {
    return this._post();
  }
  
  @Input() isOwnPost = false;
  @Input() isDetailMode = false;
  @Input() detailHtml?: SafeHtml | null;
  @Input() hideFooter = false;

  @Output() deletePost = new EventEmitter<Post>();
  
  @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;

  private videoObserver?: IntersectionObserver;

  // Sử dụng IntersectionObserver để tự động phát video thu nhỏ khi lướt tới
  ngAfterViewInit(): void {
    const videoEl = this.videoElRef?.nativeElement;
    if (!videoEl) return;

    this.videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => null); // Chơi video nếu thấy trên màn hình
        } else {
          videoEl.pause(); // Dừng nếu vuốt qua
        }
      },
      { threshold: 0.3 }
    );
    this.videoObserver.observe(videoEl);
  }

  ngOnDestroy(): void {
    this.videoObserver?.disconnect(); // Dọn dẹp listener
  }

  // Dịch tên danh mục bài viết
  readonly tagLabel = computed(() => {
    return this._post().tag || '';
  });
  
  // Lấy đoạn trích (excerpt) đã được Backend tạo sẵn
  readonly excerpt = computed(() => {
    return this._post().excerpt || '';
  });

  isYoutubeEmbed(url: string | null): boolean {
    if (!url) return false;
    return url.includes('youtube.com/') || url.includes('youtu.be/');
  }

  getSafeYoutubeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }


  /**
   * Xử lý hành động Like bài viết tại thẻ card
   * 
   * Áp dụng Optimistic Update giống PostDetailComponent.
   * Thay đổi trạng thái thích (liked) và số lượt (likeCount) ngay lập tức trên frontend
   * để tạo cảm giác phản hồi nhanh, sau đó gọi API. Nếu lỗi thì tự rollback.
   */
  toggleLike(event: Event) {
    event.preventDefault();   // Ngăn thẻ link điều hướng
    event.stopPropagation();  // Ngăn chặn sự kiện nổi bọt lên các thẻ cha

    this.likeService.optimisticTogglePostLike(
      this._post,
      this.authService,
      this.authModalService
    );
  }

  onDeleteClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.')) {
      this.deletePost.emit(this.post);
    }
  }
}
