import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import {
  AuthorPost,
  CreatePostPayload,
  PostListParams,
  UpdatePostPayload,
} from '../models/post.model';

/**
 * AuthorPostsService - Dịch vụ quản lý các bài viết của tác giả (Tạo, Sửa, Xóa, Lấy danh sách)
 * 
 * Mục đích: Tương tác với backend thông qua HTTP requests để quản lý nội dung.
 * - Nhận và gửi dữ liệu từ API.
 * - Xử lý map dữ liệu (unwrap data) để trả về payload trực tiếp cho ứng dụng.
 */
@Injectable({ providedIn: 'root' })
export class AuthorPostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Lấy danh sách bài viết do chính tác giả tạo */
  listAuthorPosts(params: PostListParams = {}): Observable<ApiResponse<AuthorPost[]>> {
    return this.http.get<ApiResponse<AuthorPost[]>>(`${this.baseUrl}/author/posts`, {
      params: this.toHttpParams(params),
    });
  }



  /** Lấy thông tin chi tiết một bài viết cụ thể của tác giả */
  getAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.http
      .get<ApiResponse<AuthorPost>>(
        `${this.baseUrl}/author/posts/${postId}`
      )
      .pipe(map(response => response.data));
  }

  /** Tạo bài viết mới */
  createAuthorPost(payload: CreatePostPayload): Observable<AuthorPost> {
    return this.http
      .post<ApiResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, payload)
      .pipe(map(response => response.data));
  }

  /** Cập nhật nội dung bài viết */
  updateAuthorPost(postId: string | number, payload: UpdatePostPayload): Observable<AuthorPost> {
    return this.http
      .patch<ApiResponse<AuthorPost>>(
        `${this.baseUrl}/author/posts/${postId}`,
        payload,
      )
      .pipe(map(response => response.data));
  }

  /** Xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu */
  deleteAuthorPostPermanently(postId: string | number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/author/posts/${postId}`)
      .pipe(map(() => undefined));
  }

  /** Chuyển đổi một plain object thành HttpParams để nối vào query string của URL */
  private toHttpParams(params: PostListParams): HttpParams {
    return Object.entries(params).reduce((httpParams, [key, value]) => {
      // Bỏ qua các giá trị rỗng hoặc undefined
      if (value === undefined || value === null || value === '') {
        return httpParams;
      }

      return httpParams.set(key, String(value));
    }, new HttpParams());
  }
}
