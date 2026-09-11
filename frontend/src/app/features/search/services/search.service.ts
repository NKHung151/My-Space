import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { User } from '../../users/models/user.model';


/**
 * SearchPost - Cấu trúc dữ liệu bài viết trả về từ API search (phiên bản rút gọn).
 *
 * Lấy từ bảng DB: `posts` JOIN `post_translations` JOIN `users`
 *   - id        → posts.id
 *   - title     → post_translations.title (đã được BE resolve theo ngôn ngữ)
 *   - createdAt → posts.published_at ?? posts.created_at
 *   - author.id        → users.id
 *   - author.name      → users.display_name ?? users.username
 *   - author.avatarUrl → users.avatar
 *
 * Lưu ý: Đây là DTO rút gọn chỉ dùng cho gợi ý tìm kiếm, không bao gồm
 * toàn bộ translations như Post model đầy đủ.
 */
export interface SearchPost {
  id: string;
  title: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    username: string;
    avatarUrl: string | null;
  };
}

/**
 * SearchResults - Tổng hợp tất cả kết quả từ API search toàn cục.
 *
 * Backend tìm kiếm song song trên 2 bảng:
 *   - users      → tìm theo users.username, users.display_name LIKE '%keyword%'
 *   - posts      → tìm theo post_translations.unaccented_title LIKE '%keyword%' (không dấu)
 */
export interface SearchResults {
  users: User[];
  posts: SearchPost[];
}

/**
 * SearchService - Dịch vụ gọi API tìm kiếm toàn cục (Global Search).
 *
 * @role Quick search — Gợi ý nhanh, trả về tối đa 5 kết quả mỗi loại (users + posts).
 *       Dùng duy nhất cho SearchModal (Ctrl+K). KHÔNG dùng cho Explore.
 *       Explore dùng FeedPostsService.list() với filter đầy đủ và phân trang.
 *
 * Mục đích:
 * Cung cấp duy nhất một phương thức `globalSearch(q)` gọi lên endpoint `GET /search?q=keyword`.
 * Backend sẽ tìm kiếm đồng thời trên users và posts rồi trả về cùng một lúc.
 *
 * Được dùng bởi: SearchModalComponent
 *   - Mỗi lần user gõ (sau debounce 300ms + distinctUntilChanged) → gọi `globalSearch(q)`
 *   - switchMap đảm bảo hủy request cũ nếu user gõ thêm trước khi request cũ hoàn thành
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Tìm kiếm toàn cục theo từ khóa `q`.
   *
   * API: GET /search?q={keyword}
   * Response: { data: SearchResults } → được unwrap qua `.pipe(map(res => res.data))`
   *
   * Backend xử lý:
   *   1. SELECT id, username, display_name, avatar FROM users WHERE username LIKE '%q%' OR display_name LIKE '%q%' LIMIT 5
   *   2. SELECT p.id, pt.title, p.published_at, u.display_name, u.avatar
   *      FROM posts p
   *      JOIN post_translations pt ON pt.post_id = p.id
   *      JOIN users u ON u.id = p.author_id
   *      WHERE pt.unaccented_title LIKE '%unaccented_q%'  ← không dấu để tìm tiếng Việt
   *      AND p.status IN ('approved', 'published')
   *      LIMIT 5
   *
   * @param q Từ khóa tìm kiếm do user nhập
   * @returns Observable<SearchResults> gồm users, posts phù hợp
   */
  globalSearch(q: string): Observable<SearchResults> {
    const params = new HttpParams().set('q', q);
    return this.http
      .get<ApiResponse<SearchResults>>(`${environment.apiUrl}/search`, { params })
      .pipe(map((res) => res.data)); // Unwrap wrapper { success, data } → lấy data trực tiếp
  }
}
