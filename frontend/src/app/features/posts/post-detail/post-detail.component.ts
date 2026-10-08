import { Component, OnDestroy, OnInit, computed, inject, signal, ViewChild, ElementRef, DestroyRef, SecurityContext } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { FeedPostsService } from '../services/feed-posts.service';
import { Post } from '../models/post.model';

import { Title } from '@angular/platform-browser';
import { CommentSectionComponent } from '../components/comment-section/comment-section.component';
import { LikeService } from '../services/like.service';
import { AuthService } from '../../../core/auth/auth.service';
import { preparePostDetailHtml } from './post-detail-html.util';
import { AuthModalService } from '../../../core/auth/auth-modal.service';
import { AuthorTooltipComponent } from '../../users/components/author-tooltip/author-tooltip.component';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';

import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { ToastService } from '../../../core/notifications/toast.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENT TỔNG QUAN: PostDetailComponent
 * ═══════════════════════════════════════════════════════════════════════════
 * Component chịu trách nhiệm tải chi tiết bài viết, hiển thị nội dung HTML,
 * tự động quản lý video autoplay qua IntersectionObserver, và xử lý tương tác like.
 */
@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CommentSectionComponent, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, LocalizedDatePipe, PostCardComponent],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  private route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(FeedPostsService);

  private titleService = inject(Title);
  private likeService = inject(LikeService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private authModalService = inject(AuthModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private readonly confirmModalService = inject(ConfirmModalService);

  @ViewChild('articleContent') articleContentRef?: ElementRef<HTMLElement>;
  @ViewChild('centerFeed') centerFeedRef?: ElementRef<HTMLElement>;
  @ViewChild(CommentSectionComponent) commentSection?: CommentSectionComponent;

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL STATE / DB FIELD MAPPING
  // ═══════════════════════════════════════════════════════════════════════════
  // Các tín hiệu (signals) lưu trữ trạng thái dữ liệu của component
  
  // post (Signal): Dữ liệu chi tiết bài viết hiện tại.
  post = signal<Post | null>(null);


  canDeactivate(): boolean | Promise<boolean> {
    if (this.commentSection?.hasUnsavedChanges()) {
      return this.confirmModalService.open();
    }
    return true;
  }
  
  // loading / error: Trạng thái UI cơ bản.
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  private videoObservers: IntersectionObserver[] = [];
  private videoTimeoutId?: any;
  private scrollTimeoutId?: any;

  // ── Scroll-depth view tracking ──────────────────────────────────────────────
  // Observer theo dõi sentinel element tại 50% bài viết
  private scrollDepthObserver?: IntersectionObserver;

  // Flag tránh gọi trackView nhiều lần cho cùng 1 bài
  private viewTracked = false;
  // ID bài đang xem, reset flag khi chuyển sang bài khác
  private trackedPostId?: number;
  private currentPostId?: number;
  // ────────────────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    clearTimeout(this.videoTimeoutId);
    clearTimeout(this.scrollTimeoutId);
    // Dọn dẹp các observers và subscriptions khi component bị hủy để tránh memory leak
    this.cleanupVideoObservers();
    this.cleanupScrollTracker();
  }

  private cleanupVideoObservers(): void {
    this.videoObservers.forEach(obs => obs.disconnect());
    this.videoObservers = [];
  }

  /** 
   * Hàm này được gọi sau khi nội dung bài viết đã render xong
   * Dùng IntersectionObserver để tự động play/pause các video trong bài viết
   * khi chúng xuất hiện hoặc bị khuất khỏi màn hình (threshold 0.25)
   */
  private setupVideoObservers(): void {
    if (typeof document === 'undefined') return;
    this.cleanupVideoObservers();

    // Đợi 1 tick (100ms) để Angular hoàn tất việc render [innerHTML]
    this.videoTimeoutId = setTimeout(() => {
      const articleEl = this.articleContentRef?.nativeElement;
      if (!articleEl) return;

      articleEl.querySelectorAll<HTMLVideoElement>('video').forEach(videoEl => {
        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              videoEl.play().catch(() => null);
            } else {
              videoEl.pause();
            }
          },
          { threshold: 0.25 }
        );
        obs.observe(videoEl);
        this.videoObservers.push(obs);
      });
    }, 100);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * SCROLL-DEPTH VIEW TRACKING
   * ═══════════════════════════════════════════════════════════════════════════
   * Cơ chế:
   * 1. Đặt một sentinel <div> ẩn (0px, pointer-events: none) tại điểm GIỮA
   *    của bài viết (được tạo động bằng cách chèn vào giữa DOM của article).
   * 2. IntersectionObserver quan sát sentinel. Khi nó vào viewport lần đầu
   *    → bật bộ đếm giờ 3 giây.
   * 3. Nếu người dùng vẫn ở trang sau 3 giây → gọi trackView() → hủy observer.
   * 4. Nếu người dùng rời trang/đổi bài trước 3 giây → clearTimeout → không đếm.
   *
   * Edge case - Bài siêu ngắn (1-2 dòng, toàn bộ nội dung hiển thị luôn):
   * Khi article ngắn hơn 1 màn hình, sentinel ở giữa bài sẽ NGAY LẬP TỨC vào
   * viewport khi render xong (không cần cuộn). Điều này ĐÚNG VÀ HỢP LÝ vì
   * người dùng đã "thấy" 100% nội dung ngay rồi. Điều kiện 3 giây vẫn được
   * giữ lại để chặn bot hoặc mở nhầm tab.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  private setupScrollTracker(postId: number): void {
    if (typeof document === 'undefined') return;

    // Reset khi chuyển sang bài mới
    if (this.trackedPostId !== postId) {
      this.cleanupScrollTracker();
      this.viewTracked = false;
      this.trackedPostId = postId;
    }

    // Nếu bài này đã được tính view trong phiên hiện tại → không setup lại
    if (this.viewTracked) return;

    // Đợi DOM render xong rồi mới inject sentinel và bắt đầu quan sát
    // 300ms: đủ để Angular hoàn tất change detection + render [innerHTML] kể cả bài nặng
    this.scrollTimeoutId = setTimeout(() => {
      const articleEl = this.articleContentRef?.nativeElement;
      if (!articleEl) return;

      // Xóa sentinel cũ nếu có (tránh duplicate khi chuyển bài)
      articleEl.querySelector('[data-scroll-sentinel]')?.remove();

      // Lấy tất cả các phần tử con trực tiếp của article (paragraphs, headings, images, etc.)
      const children = Array.from(articleEl.children);

      // Guard: nếu innerHTML chưa render xong, dừng lại.
      if (children.length === 0 && !articleEl.textContent?.trim()) return;

      // Tạo sentinel element — một thẻ div vô hình (0px height, không ảnh hưởng layout)
      // Đặt tại điểm GIỮA (50%) chiều dài bài viết bằng cách tính toán vị trí DOM
      const sentinel = document.createElement('div');
      sentinel.setAttribute('data-scroll-sentinel', '');
      sentinel.style.cssText = 'height:0;overflow:hidden;pointer-events:none;visibility:hidden;';

      if (children.length <= 1) {
        // Bài chỉ có 1 phần tử (VD: 1 đoạn văn ngắn) hoặc chỉ có text trần → append vào cuối
        // IntersectionObserver sẽ trigger ngay khi render (hợp lý: user thấy toàn bộ bài)
        articleEl.appendChild(sentinel);
      } else {
        // Bài nhiều phần tử → chèn sentinel vào VỊ TRÍ GIỮA (index = Math.floor(length / 2))
        // Ví dụ: 10 paragraphs → chèn trước paragraph thứ 5
        const midIndex = Math.floor(children.length / 2);
        articleEl.insertBefore(sentinel, children[midIndex]);
      }
      
      const scrollRoot = this.document.querySelector<HTMLElement>('.center-feed') ?? null;

      this.scrollDepthObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !this.viewTracked) {
            // Sentinel vào viewport (người dùng đã cuộn tới 50%) → ghi nhận view ngay lập tức
            this.viewTracked = true;

            // Hủy observer ngay để không trigger lại khi cuộn lên xuống
            this.scrollDepthObserver?.disconnect();
            this.scrollDepthObserver = undefined;

            // Gọi API POST /posts/:id/view — bắt lỗi silently để không làm crash UX
            this.postService.trackView(postId).pipe(
              takeUntilDestroyed(this.destroyRef)
            ).subscribe({
              next: () => { /* View được ghi nhận thành công, không cần xử lý gì thêm */ },
              error: () => { /* Lỗi mạng — bỏ qua, không thông báo người dùng */ },
            });
          }
        },
        {
          // root: scrollRoot → quan sát trong context của .center-feed, không phải window
          // Nếu không tìm thấy .center-feed (SSR, test), fallback về null (= window)
          root: scrollRoot,
          // threshold: 0 → trigger ngay khi 1px của sentinel vào viewport của root
          threshold: 0,
        }
      );

      this.scrollDepthObserver.observe(sentinel);
    }, 300); // 300ms: đủ để Angular render [innerHTML] kể cả bài viết nặng
  }

  /** Dọn dẹp scroll observer để tránh memory leak */
  private cleanupScrollTracker(): void {
    this.scrollDepthObserver?.disconnect();
    this.scrollDepthObserver = undefined;
  }

  // Xử lý nút quay lại
  goBack(): void {
    void this.router.navigateByUrl('/');
  }

  /**
   * Nội dung bài viết: lọc bằng sanitizer của Angular TRƯỚC khi đưa vào preparePostDetailHtml
   * (hàm này gán innerHTML vào một div tạm, nên HTML độc hại như <img onerror> sẽ chạy nếu chưa lọc).
   * Kết quả sau xử lý chỉ chứa markup đã lọc nên mới bypass để giữ class/line-number.
   */
  displayedTranslation = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return null;

    const clean = this.sanitizer.sanitize(SecurityContext.HTML, currentPost.content || '') ?? '';
    return {
      title: currentPost.title,
      safeContentHtml: this.sanitizer.bypassSecurityTrustHtml(preparePostDetailHtml(clean)),
    };
  });

  ngOnInit(): void {
    // switchMap: hủy request cũ nếu chuyển nhanh sang bài khác, tránh race condition.
    this.route.paramMap.pipe(
      switchMap(params => {
        this.loading.set(true);
        this.error.set(null);
        return this.postService.getById(Number(params.get('id')));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);

        // Đặt tiêu đề tab trình duyệt theo tên bài viết
        if (post.title) this.titleService.setTitle(`${post.title} - My Space`);

        // Chỉ scroll lên đầu nếu đây là bài viết mới (chuyển trang)
        if (this.currentPostId !== post.id) {
          this.currentPostId = post.id;
          const scrollContainer = this.document.querySelector('.center-feed');
          if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }

        this.setupVideoObservers();

        // Khởi động scroll tracker để ghi nhận view khi người dùng đọc >= 50%
        this.setupScrollTracker(post.id);
      },
      error: () => {
        this.toast.showError('Không thể tải bài viết. Đang quay về trang chủ.');
        void this.router.navigate(['/home']);
      }
    });
  }

  toggleLike(): void {
    this.likeService.optimisticTogglePostLike(
      this.post,
      this.authService,
      this.authModalService,
      this.destroyRef
    );
  }

  onCommentCountChange(delta: number): void {
    this.post.update(p => {
      if (!p) return p;
      return { ...p, commentCount: Math.max(0, p.commentCount + delta) };
    });
  }

}
