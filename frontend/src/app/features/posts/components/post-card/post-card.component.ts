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
import { FeedPostsService } from '../../services/feed-posts.service';

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
  private readonly postService = inject(FeedPostsService);
  private readonly elementRef = inject(ElementRef);

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
  @Input() hideFooter = false;

  @Output() deletePost = new EventEmitter<Post>();
  
  @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;

  private videoObserver?: IntersectionObserver;
  private viewObserver?: IntersectionObserver;
  private viewTracked = false;

  // Sử dụng IntersectionObserver để tự động phát video thu nhỏ khi lướt tới
  // và tính lượt xem (view count) khi người dùng thấy bài viết trên feed
  ngAfterViewInit(): void {
    this.setupViewTracking();
    
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
  
  private setupViewTracking(): void {
    if (this.isDetailMode || this.viewTracked || typeof IntersectionObserver === 'undefined') return;
    
    this.viewObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !this.viewTracked) {
          this.viewTracked = true;
          this.viewObserver?.disconnect();
          
          this.postService.trackView(this.post.id).subscribe({
            next: () => {},
            error: () => {}
          });
        }
      },
      { threshold: 0.5 } // Kích hoạt khi thấy 50% card
    );
    this.viewObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.videoObserver?.disconnect(); // Dọn dẹp listener
    this.viewObserver?.disconnect();
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
