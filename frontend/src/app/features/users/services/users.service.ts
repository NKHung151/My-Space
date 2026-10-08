import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse } from '../../../core/http/api-response.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  getPublicProfile(id: string): Observable<User> {
    return this.http
      .get<ApiResponse<User>>(`${environment.apiUrl}/users/${id}`)
      .pipe(map((res) => res.data));
  }

  getRecommended(q?: string, limit?: number, page?: number): Observable<{ items: User[], meta: any }> {
    let params = new HttpParams();
    if (q) {
      params = params.set('q', q);
    }
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    if (page) {
      params = params.set('page', page.toString());
    }
    return this.http
      .get<any>(`${environment.apiUrl}/users/recommended`, { params })
      // Format mới: data là object chứa { data: User[], meta: ... }
      .pipe(map((res) => ({ items: res.data?.data || res.data || [], meta: res.data?.meta || res.meta })));
  }
}
