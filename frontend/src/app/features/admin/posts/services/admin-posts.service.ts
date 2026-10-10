import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import { AdminPost, AdminPostsQuery } from '../models/admin-post.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminPostsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/posts`;

  constructor(private readonly http: HttpClient) {}

  getPosts(query: AdminPostsQuery): Observable<{ items: AdminPost[]; meta: any }> {
    let params = new HttpParams()
      .set('search', query.search)
      .set('page', query.page)
      .set('limit', query.limit);
    // Trước đây không gửi tag nên bộ lọc theo tag ở trang admin không có tác dụng
    if (query.tag) {
      params = params.set('tag', query.tag);
    }
    return this.http.get<ApiResponse<any>>(this.apiUrl, { params }).pipe(
      map(res => {
        const pageData = res.data;
        return {
          items: Array.isArray(pageData?.data) ? pageData.data : (pageData || []),
          meta: pageData?.meta || res.meta || { page: 1, totalPages: 1 }
        };
      })
    );
  }

  getPost(postId: string): Observable<ApiResponse<AdminPost>> {
    return this.http.get<ApiResponse<AdminPost>>(`${this.apiUrl}/${postId}`);
  }

  deletePost(postId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${postId}`);
  }
}
