import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../websocket/websocket.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../http/api-response.model';
import { unwrap } from '../http/api.operators';
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

  // Id user đã tải trạng thái online; currentUser đổi khi sửa hồ sơ thì không tải lại
  private loadedForUserId: number | null = null;

  constructor() {
    // Lắng nghe cập nhật realtime — đăng ký 1 lần, WebSocketService tự đăng ký lại khi kết nối lại.
    // (Trước đây đăng ký lại mỗi lần currentUser đổi -> nhân bản callback, gọi API thừa)
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

    toObservable(this.authService.currentUser).subscribe(user => {
      if (!user) {
        this.loadedForUserId = null;
        this._onlineUsers.set(new Set());
      } else if (user.id !== this.loadedForUserId) {
        this.loadedForUserId = user.id;
        this.loadInitialPresence();
      }
    });
  }

  private loadInitialPresence() {
    // Lấy trạng thái online ban đầu
    this.http.get<ApiResponse<number[]>>(`${environment.apiUrl}/presence`).pipe(unwrap()).subscribe({
      next: (userIds) => {
        if (userIds) {
          this._onlineUsers.set(new Set(userIds));
        }
      },
      error: (err) => console.error('[PresenceService] Failed to load initial presence', err)
    });
  }

  public isOnline(userId: number | string): boolean {
    return this._onlineUsers().has(Number(userId));
  }
}
