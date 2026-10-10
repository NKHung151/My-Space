import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, Page, PageResponse } from '../../../../core/http/api-response.model';
import { unwrap, unwrapPage } from '../../../../core/http/api.operators';
import { AdminPost, AdminPostsQuery } from '../models/admin-post.model';

@Injectable({ providedIn: 'root' })
export class AdminPostsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/posts`;

  getPosts(query: AdminPostsQuery): Observable<Page<AdminPost>> {
    let params = new HttpParams()
      .set('search', query.search)
      .set('page', query.page)
      .set('limit', query.limit);
    if (query.tag) {
      params = params.set('tag', query.tag);
    }
    return this.http.get<ApiResponse<PageResponse<AdminPost>>>(this.apiUrl, { params }).pipe(unwrapPage());
  }

  getPost(postId: string): Observable<AdminPost> {
    return this.http.get<ApiResponse<AdminPost>>(`${this.apiUrl}/${postId}`).pipe(unwrap());
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${postId}`).pipe(unwrap());
  }
}
