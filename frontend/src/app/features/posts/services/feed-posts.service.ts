import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResult, Post } from '../models/post.model';
import { ApiResponse } from '../../../core/http/api-response.model';

/** Tham số truy vấn khi lấy danh sách bài viết */
export interface PostQuery {
  q?: string;
  tag?: string;
  hasVideo?: boolean;
  authorId?: number | string;
  sort?: 'top' | 'newest' | 'trending';
  page?: number;
  limit?: number;
}

/**
 * FeedPostsService — Gọi API public posts.
 * Dùng cho HomeComponent (feed) và ExploreComponent (khám phá).
 */
@Injectable({ providedIn: 'root' })
export class FeedPostsService {
  private readonly baseUrl = `${environment.apiUrl}/posts`;

  constructor(private readonly http: HttpClient) {}

  /** Lấy danh sách bài viết công khai có filter và phân trang */
  list(query: PostQuery = {}): Observable<PaginatedResult<Post>> {
    const params = Object.entries(query).reduce((p, [k, v]) => {
      return v !== undefined && v !== null && v !== '' ? p.set(k, String(v)) : p;
    }, new HttpParams());

    return this.http
      .get<ApiResponse<{ data: Post[]; meta: PaginatedResult<Post>['meta'] }>>(this.baseUrl, { params })
      .pipe(map((res) => ({
        items: res.data?.data ?? [],
        meta: res.data?.meta ?? { total: 0, page: 1, limit: 10, totalPages: 0 },
      })));
  }

  /** Lấy chi tiết một bài viết theo ID */
  getById(id: number): Observable<Post> {
    return this.http
      .get<ApiResponse<Post>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Ghi nhận lượt xem khi người dùng đọc >= 50% bài viết.
   * Backend tự kiểm tra chống spam qua Redis.
   */
  trackView(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${id}/view`, {})
      .pipe(map(() => undefined));
  }

  /** Lấy danh sách tag phổ biến */
  getPopularTags(limit = 20): Observable<Array<{ tag: string; count: number }>> {
    const params = new HttpParams().set('limit', limit);
    return this.http
      .get<ApiResponse<Array<{ tag: string; count: number }>>>(`${this.baseUrl}/tags/popular`, { params })
      .pipe(map((res) => res.data));
  }
}
