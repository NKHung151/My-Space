import { Component, Input, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FriendsService } from '../../services/friends.service';
import { FriendshipStatus } from '../../models/friend.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-friend-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friend-button.component.html',
  styleUrl: './friend-button.component.scss'
})
export class FriendButtonComponent implements OnInit, OnDestroy {
  @Input({ required: true }) userId!: string;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() outline = false;

  private friendsService = inject(FriendsService);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  status: FriendshipStatus = 'none';
  loading = false;
  isHovered = false;
  isSelf = false;

  private statusSub?: Subscription;

  ngOnInit() {
    this.isSelf = String(this.authService.currentUser()?.id) === String(this.userId);
    if (!this.isSelf) {
      this.statusSub = this.friendsService.getFriendStatus(this.userId).subscribe(status => {
        this.ngZone.run(() => {
          this.status = status;
          this.loading = false;
        });
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

    this.ngZone.run(() => { this.loading = true; });
    
    if (this.status === 'none') {
      this.friendsService.sendRequest(this.userId).subscribe({
        next: () => this.ngZone.run(() => { this.loading = false; }),
        error: () => this.ngZone.run(() => { this.loading = false; })
      });
    } else if (this.status === 'pending_sent') {
      this.friendsService.removeFriend(this.userId).subscribe({
        next: () => this.ngZone.run(() => { this.loading = false; }),
        error: () => this.ngZone.run(() => { this.loading = false; })
      });
    } else if (this.status === 'pending_received') {
      this.friendsService.acceptRequest(this.userId).subscribe({
        next: () => this.ngZone.run(() => { this.loading = false; }),
        error: () => this.ngZone.run(() => { this.loading = false; })
      });
    } else if (this.status === 'friends') {
      this.friendsService.removeFriend(this.userId).subscribe({
        next: () => this.ngZone.run(() => { this.loading = false; }),
        error: () => this.ngZone.run(() => { this.loading = false; })
      });
    }
  }

  handleReject(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.loading || this.isSelf) return;
    
    this.ngZone.run(() => { this.loading = true; });
    this.friendsService.rejectRequest(this.userId).subscribe({
      next: () => this.ngZone.run(() => { this.loading = false; }),
      error: () => this.ngZone.run(() => { this.loading = false; })
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
