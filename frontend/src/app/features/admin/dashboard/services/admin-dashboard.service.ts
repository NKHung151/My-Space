import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import { unwrap } from '../../../../core/http/api.operators';
import { AdminDashboardOverview } from '../models/admin-dashboard.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/dashboard`;

  getOverview(): Observable<AdminDashboardOverview> {
    return this.http.get<ApiResponse<AdminDashboardOverview>>(`${this.apiUrl}/overview`).pipe(unwrap());
  }
}
