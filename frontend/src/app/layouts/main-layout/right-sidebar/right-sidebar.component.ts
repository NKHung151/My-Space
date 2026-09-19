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
  
  currentUser = this.authService.currentUser;
  friendRequests = signal<FriendUser[]>([]);
  friends = signal<FriendUser[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadData();
        // Lắng nghe sự kiện lời mời kết bạn mới
        this.webSocketService.subscribeToTopic('/user/queue/friend-requests', (newRequest: FriendRequestResponse) => {
          if (newRequest && newRequest.sender) {
            // Thêm người gửi vào đầu danh sách
            this.friendRequests.update(requests => {
              // Kiểm tra xem đã có trong danh sách chưa (tránh trùng lặp do gọi API 2 lần)
              if (requests.some(r => r.id === newRequest.sender.id)) {
                return requests;
              }
              return [newRequest.sender, ...requests];
            });
          }
        });
      } else {
        this.friendRequests.set([]);
        this.friends.set([]);
      }
    });
  }

  ngOnDestroy(): void {
    this.webSocketService.unsubscribeFromTopic('/user/queue/friend-requests');
  }

  private loadData(): void {
    // Tải danh sách bạn bè
    this.friendsService.getFriends().subscribe({
      next: (friends) => {
        this.friends.set(friends || []);
      },
      error: () => {}
    });

    // Tải lời mời kết bạn (chỉ lấy tối đa 3 người hiển thị)
    this.friendsService.getRequests().subscribe({
      next: (requests) => {
        if (requests) {
          const mappedRequests = requests.map(r => r.sender);
          this.friendRequests.set(mappedRequests);
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
