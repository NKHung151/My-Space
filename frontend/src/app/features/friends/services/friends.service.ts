import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap, BehaviorSubject, of, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ApiItemResponse } from '../../../core/http/api-response.model';
import { AuthService } from '../../../core/auth/auth.service';
import { FriendUser, FriendshipStatus } from '../models/friend.model';
import { Post } from '../../posts/models/post.model';

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/friends`;

  // Cache for friendship statuses to avoid redundant API calls
  private statusCache = new Map<string, BehaviorSubject<FriendshipStatus>>();

  getFeed(page?: number, limit?: number): Observable<{ items: Post[], meta: any }> {
    let params = new HttpParams();
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/feed`, { params })
      .pipe(map(response => {
        const pageData = response.data;
        return { 
          items: Array.isArray(pageData?.data) ? pageData.data : [], 
          meta: pageData?.meta || { page: 1, totalPages: 1 } 
        };
      }));
  }

  getFriends(): Observable<FriendUser[]> {
    return this.http.get<ApiItemResponse<FriendUser[]>>(`${this.baseUrl}`)
      .pipe(map(response => response.data));
  }

  getRequests(): Observable<{ sender: FriendUser }[]> {
    return this.http.get<ApiItemResponse<any[]>>(`${this.baseUrl}/requests`)
      .pipe(map(response => response.data));
  }

  getFriendStatus(userId: string | number): Observable<FriendshipStatus> {
    if (!this.authService.isAuthenticated()) return of('none');
    
    const idStr = String(userId);
    if (!this.statusCache.has(idStr)) {
      this.statusCache.set(idStr, new BehaviorSubject<FriendshipStatus>('none'));
      this.fetchFriendStatus(idStr);
    }
    return this.statusCache.get(idStr)!.asObservable();
  }

  private fetchFriendStatus(userId: string) {
    this.http.get<ApiItemResponse<{ status: string }>>(`${this.baseUrl}/status/${userId}`)
      .pipe(catchError(() => of({ data: { status: 'none' as FriendshipStatus } })))
      .subscribe(res => {
        if (this.statusCache.has(userId)) {
          // Normalize BE uppercase (PENDING_SENT) to FE lowercase (pending_sent)
          const normalized = (res.data?.status ?? 'none').toLowerCase() as FriendshipStatus;
          this.statusCache.get(userId)!.next(normalized);
        }
      });
  }

  sendRequest(userId: string | number): Observable<any> {
    const idStr = String(userId);
    return this.http.post(`${this.baseUrl}/requests/${idStr}`, {}).pipe(
      tap(() => this.updateStatus(idStr, 'pending_sent'))
    );
  }

  acceptRequest(userId: string | number): Observable<any> {
    const idStr = String(userId);
    return this.http.post(`${this.baseUrl}/requests/${idStr}/accept`, {}).pipe(
      tap(() => this.updateStatus(idStr, 'friends'))
    );
  }

  rejectRequest(userId: string | number): Observable<any> {
    const idStr = String(userId);
    return this.http.post(`${this.baseUrl}/requests/${idStr}/reject`, {}).pipe(
      tap(() => this.updateStatus(idStr, 'none'))
    );
  }

  removeFriend(userId: string | number): Observable<any> {
    const idStr = String(userId);
    return this.http.delete(`${this.baseUrl}/${idStr}`).pipe(
      tap(() => this.updateStatus(idStr, 'none'))
    );
  }

  private updateStatus(userId: string | number, status: FriendshipStatus) {
    const idStr = String(userId);
    if (this.statusCache.has(idStr)) {
      this.statusCache.get(idStr)!.next(status);
    } else {
      this.statusCache.set(idStr, new BehaviorSubject<FriendshipStatus>(status));
    }
  }
}
