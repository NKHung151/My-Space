import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebRTCService } from '../../../core/websocket/webrtc.service';
import { FriendUser } from '../../../features/friends/models/friend.model';
import { FriendsService } from '../../../features/friends/services/friends.service';
import { AssetImageDirective } from '../../directives/asset-image.directive';
import { DisplayNamePipe } from '../../pipes/display-name.pipe';

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule, AssetImageDirective, DisplayNamePipe],
  templateUrl: './call-modal.component.html',
  styleUrl: './call-modal.component.scss'
})
export class CallModalComponent {
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
          this.friendService.getFriends().subscribe(friends => {
            this.partnerInfo = friends.find(f => f.id === call.partnerId) || null;
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

  toggleCamera() {
    this.webrtcService.toggleCamera();
  }

  isCameraOff() {
    return this.webrtcService.isCameraOff();
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
}
