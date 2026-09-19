import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FriendUser } from '../../../../features/friends/models/friend.model';
import { ChatManagerService } from '../../services/chat-manager.service';
import { ChatService } from '../../services/chat.service';
import { MessageResponse } from '../../models/chat.model';
import { PresenceService } from '../../../../core/services/presence.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { WebSocketService } from '../../../../core/websocket/websocket.service';
import { WebRTCService } from '../../../../core/websocket/webrtc.service';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, AssetImageDirective],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss'
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @Input({ required: true }) targetUser!: FriendUser;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private chatManager = inject(ChatManagerService);
  private chatService = inject(ChatService);
  public presenceService = inject(PresenceService);
  public authService = inject(AuthService);
  private webSocketService = inject(WebSocketService);
  private webrtcService = inject(WebRTCService);
  private router = inject(Router);

  messages = signal<MessageResponse[]>([]);
  newMessage = '';
  isMinimized = signal<boolean>(false);
  conversationId: number | null = null;
  currentUser = this.authService.currentUser;
  currentUserId = this.currentUser()?.id;
  
  private messageSubscription: any;
  private editSubscription: any;
  private deleteSubscription: any;
  
  editingMessageId = signal<number | null>(null);

  ngOnInit() {
    // 1. Get or create conversation ID
    this.chatService.getConversationId(this.targetUser.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.conversationId = res.data;
          this.loadMessages();
        }
      },
      error: (err) => console.error('Failed to get conversation', err)
    });

    // 2. Subscribe to STOMP topic
    this.messageSubscription = this.webSocketService.subscribeToTopic(
      '/user/queue/messages',
      (message: MessageResponse) => {
        // Chỉ thêm tin nhắn nếu nó thuộc về conversation này
        // Vì /user/queue/messages nhận chung tất cả tin nhắn
        if (this.conversationId && message.conversationId === this.conversationId) {
          this.messages.update(msgs => [...msgs, message]);
          this.scrollToBottom();
        }
      }
    );

    // 3. Lắng nghe tin nhắn được sửa
    this.editSubscription = this.webSocketService.subscribeToTopic(
      '/user/queue/messages.edit',
      (message: MessageResponse) => {
        if (this.conversationId && message.conversationId === this.conversationId) {
          this.messages.update(msgs => msgs.map(m => m.id === message.id ? message : m));
        }
      }
    );

    // 4. Lắng nghe tin nhắn bị xóa
    this.deleteSubscription = this.webSocketService.subscribeToTopic(
      '/user/queue/messages.delete',
      (message: MessageResponse) => {
        if (this.conversationId && message.conversationId === this.conversationId) {
          this.messages.update(msgs => msgs.map(m => m.id === message.id ? message : m));
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.messageSubscription) this.messageSubscription.unsubscribe();
    if (this.editSubscription) this.editSubscription.unsubscribe();
    if (this.deleteSubscription) this.deleteSubscription.unsubscribe();
  }

  loadMessages() {
    if (!this.conversationId) return;
    this.chatService.getMessages(this.conversationId, 0, 50).subscribe({
      next: (res) => {
        if (res.data && res.data.data) {
          // Tin nhắn trả về orderByCreatedAtDesc nên phải reverse lại để cuộn xuống dưới
          this.messages.set(res.data.data.reverse());
          this.scrollToBottom();
        }
      }
    });
  }

  sendMessage() {
    const content = this.newMessage.trim();
    if (!content) return;

    if (this.editingMessageId()) {
      // Đang trong chế độ sửa tin nhắn
      this.webSocketService.sendMessage('/app/chat.editMessage', {
        messageId: this.editingMessageId(),
        content: content
      });
      this.cancelEdit();
    } else {
      // Đang trong chế độ gửi tin nhắn mới
      this.webSocketService.sendMessage('/app/chat.sendMessage', {
        receiverId: this.targetUser.id,
        content: content
      });
      this.newMessage = ''; // Chỉ clear nếu gửi mới, cancelEdit tự clear
    }
  }

  startEdit(msg: MessageResponse) {
    this.editingMessageId.set(msg.id);
    this.newMessage = msg.content;
  }

  cancelEdit() {
    this.editingMessageId.set(null);
    this.newMessage = '';
  }

  deleteMessage(id: number) {
    if (confirm('Bạn có chắc muốn thu hồi tin nhắn này không?')) {
      this.webSocketService.sendMessage('/app/chat.deleteMessage', {
        messageId: id
      });
    }
  }

  closeChat() {
    this.chatManager.closeChat(this.targetUser.id);
  }

  toggleMinimize() {
    this.isMinimized.update(m => !m);
  }

  goToProfile(event: Event, id: number) {
    event.stopPropagation();
    this.router.navigate(['/profile', id]);
  }

  startCall() {
    this.webrtcService.initiateCall(this.targetUser.id);
  }

  getCallDuration(secondsStr: string): string {
    const totalSeconds = parseInt(secondsStr, 10);
    if (isNaN(totalSeconds)) return '';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) {
      return `${m} phút ${s} giây`;
    }
    return `${s} giây`;
  }

  private scrollToBottom() {
    setTimeout(() => {
      try {
        if (this.messagesContainer) {
          this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        }
      } catch (err) { }
    }, 50);
  }

  personAvatar(person: FriendUser): string {
    return person.avatarUrl || 'images/default-avatar.png';
  }

  personDisplayName(person: FriendUser): string {
    return person.displayName || person.username;
  }
}
