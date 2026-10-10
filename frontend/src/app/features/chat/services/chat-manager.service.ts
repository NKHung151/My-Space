import { Injectable, signal, inject, effect } from '@angular/core';
import { FriendUser } from '../../friends/models/friend.model';
import { ChatService } from './chat.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { MessageResponse } from '../models/chat.model';
import { AuthService } from '../../../core/auth/auth.service';
import { filter } from 'rxjs';

// crypto.randomUUID chỉ có trong secure context (HTTPS / localhost); mở app qua http://<IP LAN> thì dùng getRandomValues
function newClientMessageId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}

@Injectable({
  providedIn: 'root'
})
export class ChatManagerService {
  private chatService = inject(ChatService);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);

  private _activeChats = signal<FriendUser[]>([]);
  public activeChats = this._activeChats.asReadonly();
  
  public unreadCounts = signal<Record<number, number>>({});

  // Tin đã gửi nhưng server chưa xác nhận (chưa nhận lại bản có cùng clientMessageId).
  // Kết nối lại thì gửi lại đúng các tin này với mã cũ -> server không tạo bản trùng.
  private pendingMessages = new Map<string, { receiverId: number; content: string; clientMessageId: string }>();
  static readonly MAX_MESSAGE_LENGTH = 5000;

  constructor() {
    // Clear chats on logout
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this._activeChats.set([]);
        this.unreadCounts.set({});
        this.pendingMessages.clear(); // không gửi tin của tài khoản cũ dưới tên tài khoản mới
      }
    }, { allowSignalWrites: true });

    // Listen to new messages to increment unread counts
    this.webSocketService.subscribeToTopic('/user/queue/messages', (message: MessageResponse) => {
      // Server xác nhận tin mình gửi -> bỏ khỏi danh sách chờ
      if (message.clientMessageId) this.pendingMessages.delete(message.clientMessageId);
      // Server gửi lại cả tin của chính mình (để đồng bộ các tab) -> không tính là chưa đọc
      if (message.senderId === this.authService.currentUser()?.id) return;
      // If the message is from someone else and their chat is not open
      const isOpen = this._activeChats().find(c => c.id === message.senderId);
      if (!isOpen) {
        this.unreadCounts.update(counts => ({
          ...counts,
          [message.senderId]: (counts[message.senderId] || 0) + 1
        }));
      } else {
        // If it's open, mark as read immediately
        this.webSocketService.sendMessage('/app/chat.markRead', { targetUserId: message.senderId });
      }
    });

    // (Tái) kết nối thành công -> gửi lại các tin chưa được xác nhận
    this.webSocketService.connectionState$.pipe(filter(Boolean)).subscribe(() => this.resendPendingMessages());

    // Listen to sync events (when marked read from another tab or locally)
    this.webSocketService.subscribeToTopic('/user/queue/unread.sync', (req: { targetUserId: number }) => {
      this.clearUnread(req.targetUserId);
    });
  }

  /** Gửi tin nhắn mới; trả false nếu nội dung không hợp lệ. */
  public sendChatMessage(receiverId: number, content: string): boolean {
    const text = content.trim();
    if (!text || text.length > ChatManagerService.MAX_MESSAGE_LENGTH) return false;

    const payload = { receiverId, content: text, clientMessageId: newClientMessageId() };
    this.pendingMessages.set(payload.clientMessageId, payload);
    // Đang mất kết nối thì chưa gửi được; tin nằm trong danh sách chờ và được gửi khi kết nối lại
    if (this.webSocketService.isConnected()) {
      this.webSocketService.sendMessage('/app/chat.sendMessage', payload);
    }
    return true;
  }

  private resendPendingMessages() {
    this.pendingMessages.forEach(payload => this.webSocketService.sendMessage('/app/chat.sendMessage', payload));
  }

  public loadUnreadCounts() {
    this.chatService.getUnreadCounts().subscribe(counts => {
      this.unreadCounts.set(counts || {});
    });
  }

  public clearUnread(userId: number) {
    this.unreadCounts.update(counts => {
      const newCounts = { ...counts };
      delete newCounts[userId];
      return newCounts;
    });
  }

  public openChat(user: FriendUser) {
    this._activeChats.update(chats => {
      if (chats.find(c => c.id === user.id)) {
        return chats;
      }
      
      const newChats = [...chats, user];
      if (newChats.length > 3) {
        newChats.shift();
      }
      return newChats;
    });

    // Clear unread and notify server
    this.clearUnread(user.id);
    this.webSocketService.sendMessage('/app/chat.markRead', { targetUserId: user.id });
  }

  public closeChat(userId: number) {
    this._activeChats.update(chats => chats.filter(c => c.id !== userId));
  }
}

