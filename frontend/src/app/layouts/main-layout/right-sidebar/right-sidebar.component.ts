import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FriendsService } from '../../../features/friends/services/friends.service';
import { FriendUser } from '../../../features/friends/models/friend.model';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthModalService } from '../../../core/auth/auth-modal.service';
import { FriendButtonComponent } from '../../../features/friends/components/friend-button/friend-button.component';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FriendButtonComponent, AssetImageDirective],
  templateUrl: './right-sidebar.component.html',
  styleUrl: './right-sidebar.component.scss'
})
export class RightSidebarComponent {
  private friendsService = inject(FriendsService);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  
  currentUser = this.authService.currentUser;
  friendRequests = signal<FriendUser[]>([]);
  friends = signal<FriendUser[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadData();
      } else {
        this.friendRequests.set([]);
        this.friends.set([]);
      }
    });
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
