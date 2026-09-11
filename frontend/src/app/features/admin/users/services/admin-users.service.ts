import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import {
  AdminUser,
  AdminUsersFilters,
  UpdateAdminUserRequest,
} from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  constructor(private readonly http: HttpClient) {}

  getUsers(filters: AdminUsersFilters): Observable<ApiResponse<AdminUser[]>> {
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

    return this.http.get<ApiResponse<AdminUser[]>>(this.apiUrl, { params });
  }

  getUser(userId: string): Observable<ApiResponse<AdminUser>> {
    return this.http.get<ApiResponse<AdminUser>>(`${this.apiUrl}/${userId}`);
  }

  updateUser(
    userId: string,
    payload: UpdateAdminUserRequest,
  ): Observable<ApiResponse<AdminUser>> {
    return this.http.patch<ApiResponse<AdminUser>>(`${this.apiUrl}/${userId}`, payload);
  }
}
