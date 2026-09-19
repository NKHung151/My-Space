import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FriendsService } from '../../../features/friends/services/friends.service';
import { FriendUser, FriendRequestResponse } from '../../../features/friends/models/friend.model';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthModalService } from '../../../core/auth/auth-modal.service';
import { FriendButtonComponent } from '../../../features/friends/components/friend-button/friend-button.component';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { PresenceService } from '../../../core/services/presence.service';
import { ChatManagerService } from '../../../features/chat/services/chat-manager.service';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FriendButtonComponent, AssetImageDirective],
  templateUrl: './right-sidebar.component.html',
  styleUrl: './right-sidebar.component.scss'
})
export class RightSidebarComponent implements OnDestroy {
  private friendsService = inject(FriendsService);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private webSocketService = inject(WebSocketService);
  public presenceService = inject(PresenceService);
  public chatManager = inject(ChatManagerService);

  currentUser = this.authService.currentUser;
  friendRequests = signal<FriendUser[]>([]);
  friends = signal<FriendUser[]>([]);

  private wsSubscribed = false;

  constructor() {
    // Đăng ký WebSocket ngay lập tức (service sẽ queue nếu chưa connected)
    this.registerWebSocketListeners();

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadData();
      } else {
        this.friendRequests.set([]);
        this.friends.set([]);
      }
    }, { allowSignalWrites: true });
  }

  private registerWebSocketListeners(): void {
    // Lắng nghe lời mời kết bạn mới (dành cho người NHẬN lời mời)
    this.webSocketService.subscribeToTopic('/user/queue/friend-requests', (newRequest: FriendRequestResponse) => {
      if (newRequest && newRequest.sender) {
        // Cập nhật cache trạng thái: người này đang gửi lời mời → trạng thái là pending_received
        this.friendsService.updateStatus(newRequest.sender.id, 'pending_received');
        this.friendRequests.update(requests => {
          if (requests.some(r => r.id === newRequest.sender.id)) return requests;
          return [newRequest.sender, ...requests];
        });
      }
    });

    // Lắng nghe sự kiện được chấp nhận kết bạn (dành cho người GỬI lời mời)
    this.webSocketService.subscribeToTopic('/user/queue/friend-accept', (newFriend: FriendUser) => {
      if (newFriend && newFriend.id) {
        // Cập nhật cache trạng thái: giờ đã là bạn bè
        this.friendsService.updateStatus(newFriend.id, 'friends');
        this.friends.update(friends => {
          if (friends.some(f => f.id === newFriend.id)) return friends;
          return [newFriend, ...friends];
        });
        // Xóa khỏi danh sách lời mời nếu có
        this.friendRequests.update(requests => requests.filter(r => r.id !== newFriend.id));
      }
    });

    // Lắng nghe sự kiện từ chối kết bạn (dành cho người bị từ chối hoặc người từ chối)
    this.webSocketService.subscribeToTopic('/user/queue/friend-reject', (rejectedId: number) => {
      if (rejectedId != null) {
        // Cập nhật cache trạng thái về none
        this.friendsService.updateStatus(rejectedId, 'none');
        this.friendRequests.update(requests => requests.filter(r => r.id !== rejectedId));
      }
    });

    // Lắng nghe sự kiện xóa bạn bè
    this.webSocketService.subscribeToTopic('/user/queue/friend-remove', (removedId: number) => {
      if (removedId != null) {
        // Cập nhật cache trạng thái về none
        this.friendsService.updateStatus(removedId, 'none');
        this.friends.update(friends => friends.filter(f => f.id !== removedId));
      }
    });
  }

  ngOnDestroy(): void {
    this.webSocketService.unsubscribeFromTopic('/user/queue/friend-requests');
    this.webSocketService.unsubscribeFromTopic('/user/queue/friend-accept');
    this.webSocketService.unsubscribeFromTopic('/user/queue/friend-reject');
    this.webSocketService.unsubscribeFromTopic('/user/queue/friend-remove');
  }

  private loadData(): void {
    this.friendsService.getFriends().subscribe({
      next: (friends) => {
        this.friends.set(friends || []);
      },
      error: () => {}
    });
    
    this.chatManager.loadUnreadCounts();

    this.friendsService.getRequests().subscribe({
      next: (requests) => {
        if (requests) {
          const mappedRequests = requests.map(r => r.sender);
          this.friendRequests.set(mappedRequests);
          // Cập nhật status cache: những người này đang gửi lời mời → pending_received
          mappedRequests.forEach(sender => {
            this.friendsService.updateStatus(sender.id, 'pending_received');
          });
        }
      },
      error: () => {}
    });
  }

  personDisplayName(person: FriendUser): string {
    return person.displayName || person.username;
  }

  personAvatar(person: FriendUser): string {
    return person.avatarUrl || 'assets/images/default-avatar.png';
  }

  openLoginModal(): void {
    this.authModalService.open();
  }
}
