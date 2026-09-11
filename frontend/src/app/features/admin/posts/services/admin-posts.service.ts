import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import { AdminPost, AdminPostsQuery } from '../models/admin-post.model';

@Injectable({ providedIn: 'root' })
export class AdminPostsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/posts`;

  constructor(private readonly http: HttpClient) {}

  getPosts(query: AdminPostsQuery): Observable<ApiResponse<AdminPost[]>> {
    let params = new HttpParams()
      .set('search', query.search)
      .set('page', query.page)
      .set('limit', query.limit);
    return this.http.get<ApiResponse<AdminPost[]>>(this.apiUrl, { params });
  }

  getPost(postId: string): Observable<ApiResponse<AdminPost>> {
    return this.http.get<ApiResponse<AdminPost>>(`${this.apiUrl}/${postId}`);
  }

  deletePost(postId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${postId}`);
  }
}
