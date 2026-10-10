import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FriendsService } from '../../services/friends.service';
import { FriendshipStatus } from '../../models/friend.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-friend-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friend-button.component.html',
  styleUrl: './friend-button.component.scss'
})
export class FriendButtonComponent implements OnInit, OnDestroy {
  @Input({ required: true }) userId!: number;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() outline = false;

  private friendsService = inject(FriendsService);
  private authService = inject(AuthService);

  status: FriendshipStatus = 'none';
  loading = false;
  isHovered = false;
  isSelf = false;

  private statusSub?: Subscription;

  ngOnInit() {
    this.isSelf = this.authService.currentUser()?.id === this.userId;
    if (!this.isSelf) {
      this.statusSub = this.friendsService.getFriendStatus(this.userId).subscribe(status => {
        this.status = status;
        this.loading = false;
      });
    }
  }

  ngOnDestroy() {
    this.statusSub?.unsubscribe();
  }

  handleAction(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.loading || this.isSelf) return;

    // Hủy lời mời đã gửi và hủy kết bạn cùng dùng API xóa quan hệ bạn bè
    const actions: Record<FriendshipStatus, () => Observable<unknown>> = {
      none: () => this.friendsService.sendRequest(this.userId),
      pending_sent: () => this.friendsService.removeFriend(this.userId),
      pending_received: () => this.friendsService.acceptRequest(this.userId),
      friends: () => this.friendsService.removeFriend(this.userId),
    };
    this.run(actions[this.status]());
  }

  handleReject(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.loading || this.isSelf) return;
    
    this.run(this.friendsService.rejectRequest(this.userId));
  }

  private run(request: Observable<unknown>): void {
    this.loading = true;
    request.subscribe({
      next: () => { this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get buttonText(): string {
    switch (this.status) {
      case 'none': return 'Thêm bạn bè';
      case 'pending_sent': return this.isHovered ? 'Hủy yêu cầu' : 'Đã gửi yêu cầu';
      case 'pending_received': return 'Chấp nhận';
      case 'friends': return this.isHovered ? 'Hủy kết bạn' : 'Bạn bè';
      default: return 'Thêm bạn bè';
    }
  }

  get buttonClass(): string {
    let classes = this.size === 'medium' ? 'btn ' : `btn btn-${this.size} `;
    
    if (this.status === 'friends') {
      classes += this.isHovered ? 'btn-danger' : (this.outline ? 'btn-outline-secondary' : 'btn-secondary');
    } else if (this.status === 'pending_sent') {
      classes += this.isHovered ? 'btn-danger' : 'btn-secondary';
    } else if (this.status === 'pending_received') {
      classes += 'btn-primary';
    } else {
      classes += this.outline ? 'btn-outline-primary' : 'btn-primary';
    }
    
    return classes;
  }
}
