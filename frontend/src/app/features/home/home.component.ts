import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ElementRef, ViewChild, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, switchMap } from 'rxjs';

import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { Post } from '../posts/models/post.model';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { AuthService } from '../../core/auth/auth.service';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';


/**
 * HomeComponent - Component trang chủ hiển thị danh sách bài viết (feed)
 * 
 * Component này quản lý việc tải danh sách bài viết theo trang.
 * Tích hợp tính năng cuộn vô hạn (infinite scroll) để tự động tải thêm dữ liệu.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, AssetImageDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  // ══════════════════════════════════════════════════════
  // Global State / DB Field Mapping / RxJS Pipeline
  // ══════════════════════════════════════════════════════
  // GIẢI THÍCH SIGNAL STATES VÀ DB FIELD MAPPING:
  // - posts: Mảng chứa bài viết (Post[]). 
  //   DB Mapping: Dữ liệu được gộp từ các bảng `posts`, `users`.
  // - page: Trang hiện tại. Map tới query param phân trang của API (vd: ?page=1).
  // - totalPages: Tổng số trang, do Backend trả về (thường tính bằng Math.ceil(total/limit)).
  // - loading: State đang tải khi gọi API lần đầu (page = 1).
  // - loadingMore: State đang tải thêm khi cuộn (page > 1).
  // ══════════════════════════════════════════════════════

  private observer?: IntersectionObserver;

  // ══════════════════════════════════════════════════════
  // CƠ CHẾ INTERSECTION OBSERVER (INFINITE SCROLL)
  // ══════════════════════════════════════════════════════
  // Tại sao dùng IntersectionObserver?
  // - Trình duyệt tự xử lý ở background thread, không block main thread như việc dùng sự kiện scroll truyền thống.
  // - rootMargin: '400px' -> kích hoạt tải dữ liệu trước khi thực sự chạm đáy 400px (pre-fetch), mang lại trải nghiệm mượt mà.
  // ══════════════════════════════════════════════════════
  @ViewChild('scrollTrigger') set scrollTrigger(el: ElementRef<HTMLElement> | undefined) {
    if (el) {
      if (!this.observer) {
        this.observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !this.loadingMore() && this.page() < this.totalPages()) {
            this.loadMore();
          }
        }, { rootMargin: '400px' });
      }
      this.observer.observe(el.nativeElement);
    }
  }

  private readonly postService = inject(FeedPostsService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly feedTrigger$ = new Subject<number>();

  readonly posts = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(1);

  readonly quickDraftAvatar = computed(() => {
    return this.authService.currentUser()?.avatarUrl ?? 'assets/images/default-avatar.svg';
  });

  constructor() {
    // ══════════════════════════════════════════════════════
    // HÀNH ĐỘNG: TẢI FEED BÀI VIẾT TẠI TRANG CHỦ (RxJS PIPELINE)
    // ══════════════════════════════════════════════════════
    // Luồng dữ liệu và Phân trang (Pagination):
    // 1. Tải bao nhiêu bài? 
    //    -> Tham số `limit: 10`. Nghĩa là mỗi lần mở trang chủ hoặc cuộn trang, API chỉ lấy ĐÚNG 10 bài.
    // 2. Tại sao lại là 10?
    //    -> Vừa đủ che phủ màn hình, giúp FE render mượt mà, BE không bị quá tải khi JOIN bảng.
    // 3. Hiển thị lên màn hình ra sao?
    //    -> Lần đầu tải (page=1): Màn hình có 10 bài.
    //    -> Cuộn xuống đáy (page=2): Nối thêm 10 bài, màn hình có 20 bài. Cứ thế tăng lên (30, 40...).
    // 4. Khi nào thì dừng cuộn?
    //    -> Backend sẽ trả về `totalPages` = Math.ceil(Tổng số bài viết / limit). Ví dụ DB có 55 bài -> totalPages = 6.
    //    -> Khi người dùng cuộn đến trang 6, biến `this.page() < this.totalPages()` trả về FALSE, hệ thống ngừng gọi API.
    //
    // Flow cụ thể trong Code:
    // feedTrigger$.next(page)
    //       ↓
    // switchMap(...) → Gọi API với limit: 10. Tự Hủy request cũ nếu user đổi tab nhanh.
    //       ↓
    // .subscribe(res) → Merge 10 bài mới vào mảng 10 bài cũ (Infinite scroll)
    // ══════════════════════════════════════════════════════
    this.feedTrigger$.pipe(
      switchMap((page) => {
        this.loading.set(page === 1 && this.posts().length === 0);
        this.loadingMore.set(page > 1);
        return this.postService.list({ page, limit: 10 });
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => {
        const currentPage = res?.meta?.page || 1;
        const items = res?.items || [];

        // ══════════════════════════════════════════════════════
        // PHÂN TÁCH LOGIC XỬ LÝ KẾT QUẢ THEO TRANG
        // ══════════════════════════════════════════════════════
        // - page === 1: Người dùng load trang đầu -> overwrite toàn bộ mảng.
        // - page > 1: Người dùng scroll xuống cuối -> append bằng spread operator ([...cũ, ...mới]).
        // ══════════════════════════════════════════════════════
        this.posts.set(currentPage === 1 ? items : [...this.posts(), ...items]);
        this.page.set(currentPage);
        this.totalPages.set(res?.meta?.totalPages || 1);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  ngOnInit() {
    this.feedTrigger$.next(1);
  }

  loadMore() {
    if (this.page() < this.totalPages()) {
      const nextPage = this.page() + 1;
      this.feedTrigger$.next(nextPage);
    }
  }

}
