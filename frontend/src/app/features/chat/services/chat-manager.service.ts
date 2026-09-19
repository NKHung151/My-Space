import { Injectable, signal, inject } from '@angular/core';
import { FriendUser } from '../../friends/models/friend.model';
import { ChatService } from './chat.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { MessageResponse } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatManagerService {
  private chatService = inject(ChatService);
  private webSocketService = inject(WebSocketService);

  private _activeChats = signal<FriendUser[]>([]);
  public activeChats = this._activeChats.asReadonly();
  
  public unreadCounts = signal<Record<number, number>>({});

  constructor() {
    // Listen to new messages to increment unread counts
    this.webSocketService.subscribeToTopic('/user/queue/messages', (message: MessageResponse) => {
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

    // Listen to sync events (when marked read from another tab or locally)
    this.webSocketService.subscribeToTopic('/user/queue/unread.sync', (req: { targetUserId: number }) => {
      this.clearUnread(req.targetUserId);
    });
  }

  public loadUnreadCounts() {
    this.chatService.getUnreadCounts().subscribe(res => {
      this.unreadCounts.set(res.data || {});
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

