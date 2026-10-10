import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, computed, inject, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Post } from '../../models/post.model';
import { LikeService } from '../../services/like.service';
import { UserPreferencesService } from '../../../../core/preferences/user-preferences.service';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, LocalizedDatePipe],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent implements OnDestroy, AfterViewInit {

  private readonly likeService = inject(LikeService);
  private readonly sanitizer = inject(DomSanitizer);

  // Signal chứa dữ liệu bài viết hiện tại của card
  private _post = signal<Post>({} as Post);
  
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

  @Output() deletePost = new EventEmitter<Post>();

  private readonly preferences = inject(UserPreferencesService).preferences;

  /** Cài đặt "Giao diện gọn": ở feed chỉ hiện tiêu đề + thông tin, ẩn đoạn trích và ảnh/video bìa. */
  get compactView(): boolean {
    return !this.isDetailMode && this.preferences().compactView;
  }
  
  @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;

  private videoObserver?: IntersectionObserver;

  // Sử dụng IntersectionObserver để tự động phát video thu nhỏ khi lướt tới.
  // Lượt xem chỉ được tính ở trang chi tiết (đọc tới 50% bài) — trước đây mỗi thẻ lướt qua trên feed cũng gọi
  // POST /view, lướt nhanh là chạm giới hạn 60 request/phút và các thao tác khác (like, bình luận) bị 429.
  ngAfterViewInit(): void {
    const videoEl = this.videoElRef?.nativeElement;
    // Cài đặt "Tự phát media" tắt -> không tự chạy video khi lướt tới
    if (!videoEl || !this.preferences().autoPlayMedia) return;

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
  
  /** Excerpt HTML an toàn: chứa <!--TRUNCATED--> thì gắn nút Xem thêm. */
  readonly safeExcerpt = computed(() => {
    const raw = this._post().excerpt || '';
    if (!raw) return null;
    // Lọc excerpt bằng sanitizer của Angular trước, chỉ bypass sau khi đã gắn nút "Xem thêm" (markup tĩnh)
    const truncated = raw.includes('<!--TRUNCATED-->');
    const clean = this.sanitizer.sanitize(SecurityContext.HTML, raw.replace('<!--TRUNCATED-->', '')) ?? '';
    const html = truncated
      ? clean + ' <span class="fw-bold cursor-pointer ms-1" style="color: var(--text-muted); font-size: 0.9em;">... Xem thêm</span>'
      : clean;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  /** Chỉ nhận đúng URL nhúng của YouTube để tránh đưa URL tùy ý (vd. javascript:) vào iframe. */
  isYoutubeEmbed(url: string | null): boolean {
    if (!url) return false;
    return /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+/.test(url);
  }

  getSafeYoutubeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  toggleLike(event: Event) {
    event.preventDefault();   // Ngăn thẻ link điều hướng
    event.stopPropagation();  // Ngăn chặn sự kiện nổi bọt lên các thẻ cha

    this.likeService.optimisticTogglePostLike(this._post);
  }

  onDeleteClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.')) {
      this.deletePost.emit(this.post);
    }
  }
}
