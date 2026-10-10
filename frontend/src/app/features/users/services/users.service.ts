import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse, Page, PageResponse } from '../../../core/http/api-response.model';
import { unwrap, unwrapPage } from '../../../core/http/api.operators';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getPublicProfile(id: string): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${environment.apiUrl}/users/${id}`).pipe(unwrap());
  }

  getRecommended(q?: string, limit?: number, page?: number): Observable<Page<User>> {
    let params = new HttpParams();
    if (q) {
      params = params.set('q', q);
    }
    if (limit) {
      params = params.set('limit', limit);
    }
    if (page) {
      params = params.set('page', page);
    }
    return this.http
      .get<ApiResponse<PageResponse<User>>>(`${environment.apiUrl}/users/recommended`, { params })
      .pipe(unwrapPage());
  }
}
