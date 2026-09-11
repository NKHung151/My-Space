import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import { AdminDashboardOverview } from '../models/admin-dashboard.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly apiUrl = `${environment.apiUrl}/admin/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<ApiResponse<AdminDashboardOverview>> {
    return this.http.get<ApiResponse<AdminDashboardOverview>>(`${this.apiUrl}/overview`);
  }
}
