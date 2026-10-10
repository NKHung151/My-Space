import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, Page, PageResponse } from '../../../../core/http/api-response.model';
import { unwrap, unwrapPage } from '../../../../core/http/api.operators';
import {
  AdminUser,
  AdminUsersFilters,
  UpdateAdminUserRequest,
} from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  getUsers(filters: AdminUsersFilters): Observable<Page<AdminUser>> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.role) {
      params = params.set('role', filters.role);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return this.http.get<ApiResponse<PageResponse<AdminUser>>>(this.apiUrl, { params }).pipe(unwrapPage());
  }

  getUser(userId: number): Observable<AdminUser> {
    return this.http.get<ApiResponse<AdminUser>>(`${this.apiUrl}/${userId}`).pipe(unwrap());
  }

  updateUser(userId: number, payload: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.http.patch<ApiResponse<AdminUser>>(`${this.apiUrl}/${userId}`, payload).pipe(unwrap());
  }
}
