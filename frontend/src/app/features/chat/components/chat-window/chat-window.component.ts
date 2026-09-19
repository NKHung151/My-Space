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
  private authService = inject(AuthService);
  private webSocketService = inject(WebSocketService);
  private router = inject(Router);

  messages = signal<MessageResponse[]>([]);
  newMessage = signal<string>('');
  isMinimized = signal<boolean>(false);
  conversationId: number | null = null;
  currentUser = this.authService.currentUser;
  currentUserId = this.currentUser()?.id;
  
  private messageSubscription: any;

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
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
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
    const content = this.newMessage().trim();
    if (!content) return;
    
    this.webSocketService.sendMessage('/app/chat.sendMessage', {
      receiverId: this.targetUser.id,
      content: content
    });
    
    this.newMessage.set(''); // Clear input
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

  notImplemented() {
    alert('Tính năng thoại và video sẽ được làm ở phiên bản sau');
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
