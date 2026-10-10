import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Post } from '../models/post.model';
import { ApiResponse, Page, PageResponse } from '../../../core/http/api-response.model';
import { unwrap, unwrapPage } from '../../../core/http/api.operators';

/** Tham số truy vấn khi lấy danh sách bài viết */
export interface PostQuery {
  q?: string;
  tag?: string;
  hasVideo?: boolean;
  authorId?: number | string;
  page?: number;
  limit?: number;
}

export interface PopularTag {
  tag: string;
  count: number;
}

/**
 * FeedPostsService — Gọi API public posts.
 * Dùng cho HomeComponent (feed) và ExploreComponent (khám phá).
 */
@Injectable({ providedIn: 'root' })
export class FeedPostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/posts`;

  /** Lấy danh sách bài viết công khai có filter và phân trang */
  list(query: PostQuery = {}): Observable<Page<Post>> {
    const params = Object.entries(query).reduce((p, [k, v]) => {
      return v !== undefined && v !== null && v !== '' ? p.set(k, String(v)) : p;
    }, new HttpParams());

    return this.http.get<ApiResponse<PageResponse<Post>>>(this.baseUrl, { params }).pipe(unwrapPage());
  }

  /** Lấy chi tiết một bài viết theo ID */
  getById(id: number): Observable<Post> {
    return this.http.get<ApiResponse<Post>>(`${this.baseUrl}/${id}`).pipe(unwrap());
  }

  //  Ghi nhận lượt xem khi người dùng đọc >= 50% bài viết.
  //  Backend tự kiểm tra chống spam qua Redis.
  trackView(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/view`, {}).pipe(unwrap());
  }

  /** Lấy danh sách tag phổ biến */
  getPopularTags(limit = 20): Observable<PopularTag[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http
      .get<ApiResponse<PopularTag[]>>(`${this.baseUrl}/tags/popular`, { params })
      .pipe(unwrap());
  }
}
