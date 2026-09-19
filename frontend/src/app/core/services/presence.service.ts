import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../websocket/websocket.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../http/api-response.model';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private http = inject(HttpClient);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);

  // Lưu trữ các userId đang online
  private _onlineUsers = signal<Set<number>>(new Set());
  public onlineUsers = this._onlineUsers.asReadonly();

  constructor() {
    // Khi user đăng nhập thì init
    toObservable(this.authService.currentUser).subscribe((user: any) => {
      if (user) {
        this.init();
      } else {
        this._onlineUsers.set(new Set());
        this.webSocketService.unsubscribeFromTopic('/topic/presence');
      }
    });
  }

  private init() {
    // Lấy trạng thái online ban đầu
    this.http.get<ApiResponse<number[]>>(`${environment.apiUrl}/presence`).subscribe({
      next: (response) => {
        if (response.data) {
          this._onlineUsers.set(new Set(response.data));
        }
      },
      error: (err) => console.error('[PresenceService] Failed to load initial presence', err)
    });

    // Lắng nghe cập nhật realtime
    this.webSocketService.subscribeToTopic('/topic/presence', (message: { userId: number, online: boolean }) => {
      if (message && message.userId != null) {
        this._onlineUsers.update(current => {
          const newSet = new Set(current);
          if (message.online) {
            newSet.add(message.userId);
          } else {
            newSet.delete(message.userId);
          }
          return newSet;
        });
      }
    });
  }

  public isOnline(userId: number | string): boolean {
    return this._onlineUsers().has(Number(userId));
  }
}
