import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { CreatePostPayload, PaginatedResult, Post, UpdatePostPayload } from '../models/post.model';


//  AuthorPostsService — Quản lý bài viết của tác giả đã đăng nhập (CRUD).
//  Yêu cầu Authorization header (được tự động đính kèm bởi AuthInterceptor).

@Injectable({ providedIn: 'root' })
export class AuthorPostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/author/posts`;

  // Lấy danh sách bài viết của chính tác giả (có phân trang)
  listMyPosts(page = 1, limit = 10): Observable<PaginatedResult<Post>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<{ data: Post[]; meta: PaginatedResult<Post>['meta'] }>>(this.baseUrl, { params })
      .pipe(map((res) => ({
        items: res.data?.data ?? [],
        meta: res.data?.meta ?? { total: 0, page: 1, limit: 10, totalPages: 0 },
      })));
  }

  // Lấy chi tiết một bài viết của tác giả
  getAuthorPost(postId: string | number): Observable<Post> {
    return this.http
      .get<ApiResponse<Post>>(`${this.baseUrl}/${postId}`)
      .pipe(map((res) => res.data));
  }

  // Tạo bài viết mới
  createAuthorPost(payload: CreatePostPayload): Observable<Post> {
    return this.http
      .post<ApiResponse<Post>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  /** Cập nhật nội dung bài viết */
  updateAuthorPost(postId: string | number, payload: UpdatePostPayload): Observable<Post> {
    return this.http
      .patch<ApiResponse<Post>>(`${this.baseUrl}/${postId}`, payload)
      .pipe(map((res) => res.data));
  }

  /** Xóa vĩnh viễn bài viết */
  deleteAuthorPost(postId: string | number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${postId}`)
      .pipe(map(() => undefined));
  }
}
