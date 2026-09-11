import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';

import { User } from '../users/models/user.model';
import { UsersService } from '../users/services/users.service';
import { SearchService, SearchResults } from './services/search.service';
import { SearchModalService } from './search-modal.service';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';


/**
 * SearchModalComponent - Hộp tìm kiếm toàn cục hiện ra khi user kích hoạt.
 *
 * Chức năng chính:
 * 1. **Tìm kiếm real-time**: User gõ → debounce 300ms → gọi API globalSearch → hiển thị kết quả
 *    (users, posts) ngay trong dropdown.
 * 2. **Trending khi chưa gõ**: Khi modal vừa mở và ô input trống, hiển thị danh sách tác giả
 *    nổi bật (tải một lần duy nhất, không tải lại khi mở lại modal).
 * 3. **Điều hướng**: Click vào kết quả → navigate đến trang tương ứng và đóng modal.
 *    Nhấn Enter → navigate đến /explore?query=keyword để xem đầy đủ kết quả.
 *
 * Cơ chế Search Pipeline (RxJS):
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  User gõ → onInput() → queryInput$.next(value)                     │
 * │       ↓                                                             │
 * │  debounceTime(300ms)  ← Chờ user dừng gõ 300ms mới xử lý          │
 * │       ↓                                                             │
 * │  distinctUntilChanged() ← Bỏ qua nếu giá trị giống lần trước      │
 * │       ↓                                                             │
 * │  switchMap(q → globalSearch(q))                                     │
 * │    - Nếu q rỗng: trả về [] ngay, không gọi API                     │
 * │    - Nếu q có giá trị: gọi SearchService.globalSearch(q)           │
 * │    - switchMap HỦY request cũ nếu user gõ thêm trước khi có kết quả│
 * │       ↓                                                             │
 * │  .subscribe(res) → results.set(res) → Angular re-render template   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Signals được dùng (thay vì BehaviorSubject) vì Angular tự track dependency:
 *   - query: string gõ hiện tại
 *   - results: SearchResults (users, posts từ API)
 *   - searching: boolean cờ loading khi đang gọi API
 *   - trendingAuthors: User[] gợi ý khi chưa gõ gì
 */
@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, AuthorTooltipComponent, AssetImageDirective],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.scss',
})
export class SearchModalComponent {
  /** Tham chiếu tới phần tử DOM của ô input để có thể focus programmatically khi modal mở */
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly modalService = inject(SearchModalService);
  private readonly globalSearchService = inject(SearchService);
  private readonly userService = inject(UsersService);

  private readonly router = inject(Router);

  /** Signal lưu chuỗi từ khóa hiện tại user đang gõ */
  readonly query = signal('');

  /**
   * Signal lưu kết quả tìm kiếm từ API.
   * Khởi tạo rỗng, được cập nhật sau mỗi lần API globalSearch trả về.
   *   - results().users     ← từ bảng users (tìm theo username/display_name)
   *   - results().posts     ← từ bảng posts + post_translations (unaccented_title LIKE)
   */
  readonly results = signal<SearchResults>({ users: [], posts: [] });

  /** Signal cờ loading: true khi đang chờ API globalSearch trả về */
  readonly searching = signal(false);

  /**
   * Signal lưu danh sách tác giả nổi bật (hiển thị khi chưa gõ gì).
   * Lấy từ API GET /users/recommended → users.role, friends_count... (6 người)
   * Tải một lần duy nhất (trendingLoaded flag), không tải lại khi đóng mở modal.
   */
  readonly trendingAuthors = signal<User[]>([]);




  /** Computed: true khi ô input có ít nhất 1 ký tự (không tính khoảng trắng) */
  readonly hasQuery = computed(() => this.query().trim().length > 0);

  /**
   * Subject trung gian để áp dụng debounce + distinctUntilChanged lên luồng input.
   * Mỗi lần user gõ → onInput() → queryInput$.next(value) → pipeline RxJS xử lý.
   * Dùng Subject thay vì gọi trực tiếp vì Subject cho phép pipe các operators.
   */
  private readonly queryInput$ = new Subject<string>();

  /** Cờ đánh dấu đã tải trending hay chưa, tránh gọi API lại mỗi lần mở modal */
  private trendingLoaded = false;

  constructor() {
    // ══════════════════════════════════════════════════════
    // PIPELINE TÌM KIẾM REAL-TIME
    // ══════════════════════════════════════════════════════
    this.queryInput$
      .pipe(
        // Chờ 300ms sau lần gõ cuối cùng mới xử lý (tránh gọi API mỗi phím)
        debounceTime(300),
        // Bỏ qua nếu giá trị không đổi (vd: user bấm phím mũi tên không thay đổi text)
        distinctUntilChanged(),
        // switchMap: HỦY request cũ, tạo request mới mỗi khi keyword thay đổi
        // → Ngăn chặn race condition: request cũ chậm trả về sau request mới
        switchMap((q) => {
          if (!q.trim()) {
            // Nếu ô input bị xóa hết → reset searching, không gọi API
            this.searching.set(false);
            return [];
          }
          this.searching.set(true); // Hiện spinner loading
          return this.globalSearchService.globalSearch(q).pipe(
            catchError(() => {
              // Nếu API lỗi → tắt spinner, trả về kết quả rỗng, không crash app
              this.searching.set(false);
              return of({ users: [], posts: [] });
            })
          );
        }),
      )
      .subscribe((res) => {
        this.searching.set(false); // Tắt spinner khi có kết quả
        // Kiểm tra `!Array.isArray(res)` vì switchMap có thể trả về [] (mảng rỗng) khi q trống
        if (res && !Array.isArray(res)) this.results.set(res);
      });

    // ══════════════════════════════════════════════════════
    // EFFECT: PHẢN ỨNG KHI MODAL MỞ/ĐÓNG
    // ══════════════════════════════════════════════════════
    // effect() chạy lại mỗi khi bất kỳ signal nào bên trong nó thay đổi.
    // Ở đây: theo dõi modalService.isOpen() Signal.
    effect(() => {
      if (this.modalService.isOpen()) {
        // Modal vừa mở:
        // 1. Focus vào ô input sau 1 tick (setTimeout 0) để tránh ExpressionChangedAfterCheck
        setTimeout(() => this.searchInputRef?.nativeElement.focus(), 0);
        // 2. Tải trending chỉ lần đầu tiên (trendingLoaded = false)
        if (!this.trendingLoaded) this.loadTrending();
      } else {
        // Modal vừa đóng: reset query và kết quả về trạng thái ban đầu
        this.query.set('');
        this.results.set({ users: [], posts: [] });
      }
    }, { allowSignalWrites: true }); // Cho phép ghi signal bên trong effect
  }

  /**
   * Tải danh sách tác giả nổi bật để hiển thị khi ô tìm kiếm còn trống.
   * Chỉ gọi một lần duy nhất trong vòng đời của component (trendingLoaded flag).
   *
   * API 1: GET /users/recommended?limit=6
   *   → Trả về 6 users nổi bật (tính theo friends, role, activity...)
   *   → users.avatar (users.avatar), users.display_name, users.username
   */
  private loadTrending() {
    this.trendingLoaded = true;

    this.userService.getRecommended(undefined, 6).subscribe((res) => {
      this.trendingAuthors.set(res.items);
    });
  }

  /**
   * Được gọi mỗi khi user gõ vào ô input.
   * Cập nhật query signal (để template reactive) và đẩy giá trị vào queryInput$ pipeline.
   * @param value Giá trị hiện tại của ô input
   */
  onInput(value: string) {
    this.query.set(value);        // Cập nhật signal để hasQuery computed tự tính lại
    this.queryInput$.next(value); // Đẩy vào pipeline debounce → API call
  }

  /**
   * Xóa ô tìm kiếm và reset kết quả về rỗng.
   * Được gọi khi user bấm nút X (clear button) trong modal.
   */
  clear() {
    this.query.set('');
    this.results.set({ users: [], posts: [] });
  }

  /**
   * Đóng Search Modal.
   * Gọi SearchModalService.close() → isOpen Signal = false
   * → SearchModalComponent ẩn khỏi DOM (hoặc *ngIf = false)
   */
  close() {
    this.modalService.close();
  }

  /**
   * Lắng nghe phím Escape trên toàn document.
   * Khi nhấn Escape → đóng modal nếu đang mở.
   * @HostListener đảm bảo listener bị remove khi component bị destroy (không memory leak).
   */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modalService.isOpen()) this.close();
  }



  /**
   * Điều hướng đến trang chi tiết bài viết khi user click vào kết quả.
   * Đóng modal trước khi navigate để tránh modal chồng lên trang mới.
   * Route: /post/:postId
   */
  goToPost(postId: string | number) {
    this.close();
    this.router.navigate(['/post', postId]);
  }

  /**
   * Điều hướng đến trang profile tác giả khi user click vào kết quả.
   * Route: /profile/:userId
   */
  goToAuthor(userId: string | number) {
    this.close();
    this.router.navigate(['/profile', userId]);
  }

  /**
   * Xử lý khi user nhấn Enter trong ô tìm kiếm.
   * Nếu có từ khóa → đóng modal và navigate đến trang Explore với full kết quả.
   * Route: /explore?query=keyword
   * Tại sao /explore? Vì trang explore đã có logic tìm kiếm đầy đủ với phân trang.
   */
  onEnter() {
    if (!this.hasQuery()) return; // Không làm gì nếu ô input rỗng
    this.close();
    this.router.navigate(['/explore'], { queryParams: { query: this.query() } });
  }
}
