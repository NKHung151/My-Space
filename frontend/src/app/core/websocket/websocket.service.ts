import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../notifications/toast.service';
import { environment } from '../../../environments/environment';

type TopicCallback = (message: any) => void;

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();

  // STOMP subscription đang mở (mất khi socket đóng, tạo lại khi kết nối lại)
  private subscriptions: Map<string, StompSubscription> = new Map();
  // Callback theo topic — giữ qua các lần ngắt/kết nối lại và đăng xuất/đăng nhập.
  // Trước đây disconnect() xóa map này nên các service đăng ký 1 lần trong constructor (WebRTC, Chat)
  // không còn nhận cuộc gọi / tin nhắn sau khi đăng xuất rồi đăng nhập lại.
  private topicCallbacks: Map<string, Set<TopicCallback>> = new Map();

  // Lần kết nối đầu dùng access token vừa đăng nhập; các lần kết nối lại phải lấy token mới
  // (access token chỉ sống 15 phút, token cũ sẽ bị server từ chối CONNECT)
  private needsFreshToken = false;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });

    // Lỗi nghiệp vụ từ các handler WebSocket ở server (gửi không thành công, cuộc gọi không hợp lệ...)
    this.subscribeToTopic('/user/queue/errors', (error: { message?: string }) => {
      if (error?.message) this.toast.showError(error.message);
    });
  }

  private connect() {
    if (this.client?.active) return;
    if (!this.authService.getToken()) return;

    const socketUrl = `${environment.apiUrl.replace('/api', '')}/ws`;
    this.needsFreshToken = false;

    this.client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      beforeConnect: async () => {
        if (this.needsFreshToken) {
          try {
            await firstValueFrom(this.authService.refreshSession());
          } catch {
            // Phiên hết hạn: currentUser -> null, effect ở constructor sẽ ngắt kết nối
            this.authService.expireSession();
            return;
          }
        }
        this.client!.connectHeaders = { Authorization: `Bearer ${this.authService.getToken()}` };
      },
      // Log STOMP chỉ bật ở môi trường dev (trước đây in mọi frame ra console ở cả production)
      debug: environment.production ? () => {} : (str) => console.debug('[STOMP]', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.connectionStateSubject.next(true);
      // Đăng ký lại mọi topic đang có người nghe sau khi (tái) kết nối
      this.topicCallbacks.forEach((_, topic) => this.doSubscribe(topic));
    };

    this.client.onStompError = (frame) => {
      console.error('[WS] Broker error: ' + frame.headers['message']);
      this.needsFreshToken = true;
    };

    this.client.onWebSocketClose = () => {
      this.connectionStateSubject.next(false);
      this.subscriptions.clear();
      this.needsFreshToken = true;
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client?.active) {
      void this.client.deactivate();
    }
    this.client = null;
    this.connectionStateSubject.next(false);
    this.subscriptions.clear();
  }

  /** Đăng ký nghe 1 topic; gọi unsubscribe() của handle trả về để gỡ ĐÚNG callback này. */
  public subscribeToTopic(topic: string, callback: TopicCallback): { unsubscribe: () => void } {
    if (!this.topicCallbacks.has(topic)) {
      this.topicCallbacks.set(topic, new Set());
    }
    this.topicCallbacks.get(topic)!.add(callback);

    if (this.client?.connected) {
      this.doSubscribe(topic);
    }

    return {
      unsubscribe: () => {
        const callbacks = this.topicCallbacks.get(topic);
        if (!callbacks) return;
        callbacks.delete(callback);
        // Không còn ai nghe -> hủy STOMP subscription
        if (callbacks.size === 0) {
          this.topicCallbacks.delete(topic);
          this.subscriptions.get(topic)?.unsubscribe();
          this.subscriptions.delete(topic);
        }
      },
    };
  }

  private doSubscribe(topic: string): void {
    if (this.subscriptions.has(topic) || !this.client?.connected) return;

    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      try {
        const parsed = message.body ? JSON.parse(message.body) : null;
        this.topicCallbacks.get(topic)?.forEach((cb) => cb(parsed));
      } catch (e) {
        console.error('[WS] Failed to parse message on topic', topic, e);
      }
    });
    this.subscriptions.set(topic, subscription);
  }

  public isConnected(): boolean {
    return !!this.client?.connected;
  }

  public sendMessage(destination: string, payload: any): void {
    if (this.client?.connected) {
      this.client.publish({ destination, body: JSON.stringify(payload) });
    } else {
      console.warn('[WS] Cannot send message, client not connected');
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
