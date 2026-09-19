import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebRTCService } from '../../../core/websocket/webrtc.service';
import { FriendUser } from '../../../features/friends/models/friend.model';
import { FriendsService } from '../../../features/friends/services/friends.service';
import { AssetImageDirective } from '../../directives/asset-image.directive';

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule, AssetImageDirective],
  templateUrl: './call-modal.component.html',
  styleUrl: './call-modal.component.scss'
})
export class CallModalComponent implements OnInit {
  public webrtcService = inject(WebRTCService);
  private friendService = inject(FriendsService);

  activeCall = this.webrtcService.activeCall;
  partnerInfo: FriendUser | null = null;
  duration = '00:00';
  private timerInterval: any;

  constructor() {
    effect(() => {
      const call = this.activeCall();
      if (call) {
        if (!this.partnerInfo || this.partnerInfo.id !== call.partnerId) {
          // Load partner info
          // Lấy nhanh từ danh sách bạn bè
          this.friendService.getFriends().subscribe((res: any) => {
            this.partnerInfo = res?.find((f: any) => f.id === call.partnerId) || null;
          });
        }
        
        if (call.status === 'ACCEPTED' && call.startTime) {
          this.startTimer(call.startTime);
        } else {
          this.stopTimer();
        }
      } else {
        this.partnerInfo = null;
        this.stopTimer();
      }
    });
  }

  ngOnInit() {}

  acceptCall() {
    this.webrtcService.acceptCall();
  }

  rejectCall() {
    this.webrtcService.rejectCall();
  }

  cancelCall() {
    this.webrtcService.cancelCall();
  }

  endCall() {
    this.webrtcService.endCall();
  }

  toggleMute() {
    this.webrtcService.toggleMute();
  }

  isMuted() {
    return this.webrtcService.isMuted();
  }

  private startTimer(startTime: Date) {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      this.duration = `${m}:${s}`;
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.duration = '00:00';
    }
  }

  getDisplayName(): string {
    return this.partnerInfo?.displayName || this.partnerInfo?.username || 'Người dùng';
  }

  getAvatarUrl(): string {
    return this.partnerInfo?.avatarUrl || 'images/default-avatar.png';
  }
}
