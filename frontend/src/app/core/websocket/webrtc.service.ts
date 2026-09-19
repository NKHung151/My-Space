import { Injectable, inject, signal, effect } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { AuthService } from '../auth/auth.service';

export interface CallResponse {
  id: number;
  callerId: number;
  calleeId: number;
  status: string;
  type: string;
  isVideo?: boolean;
  createdAt: string;
}

export interface SignalRequest {
  callId: number;
  targetId: number;
  type: string;
  sdp?: any;
  candidate?: any;
}

export interface ActiveCallState {
  callId: number;
  isIncoming: boolean;
  status: 'RINGING' | 'ACCEPTED' | 'ENDED' | 'REJECTED' | 'CANCELLED';
  partnerId: number;
  isVideo?: boolean;
  partnerInfo?: any; // Dùng để hiển thị thông tin UI (nếu cần)
  startTime?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);
  
  public activeCall = signal<ActiveCallState | null>(null);
  
  private peerConnection: RTCPeerConnection | null = null;
  public localStream = signal<MediaStream | null>(null);
  public remoteStream = signal<MediaStream | null>(null);
  
  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {
    effect(() => {
      if (!this.authService.currentUser()) {
        if (this.activeCall()) {
          this.endCall();
        }
        this.activeCall.set(null);
        this.cleanupCall();
      }
    }, { allowSignalWrites: true });

    this.listenForCalls();
    this.listenForSignals();
  }

  private listenForCalls() {
    this.webSocketService.subscribeToTopic('/user/queue/calls', (call: CallResponse) => {
      const state = this.activeCall();
      
      switch (call.type) {
        case 'incoming':
          if (!state) {
            // Nhận cuộc gọi mới
            this.activeCall.set({
              callId: call.id,
              isIncoming: true,
              status: 'RINGING',
              partnerId: call.callerId,
              isVideo: call.isVideo
            });
            this.playRingtone();
          }
          break;
        case 'initiated':
          if (state && !state.isIncoming && state.callId === 0) {
            // Cập nhật callId sau khi server lưu vào DB thành công
            this.activeCall.update(s => s ? { ...s, callId: call.id } : null);
          }
          break;
        case 'accepted':
          if (state && (state.callId === call.id || state.callId === 0)) {
            this.activeCall.update(s => s ? { ...s, callId: call.id, status: 'ACCEPTED', startTime: new Date() } : null);
            this.stopRingtone();
            if (!state.isIncoming) {
              // Người gọi nhận được "accepted" => Bắt đầu luồng WebRTC Offer
              this.startPeerConnection(true, state.isVideo);
            }
          }
          break;
        case 'rejected':
        case 'cancelled':
        case 'ended':
        case 'missed':
          if (state && (state.callId === call.id || state.callId === 0)) {
            this.activeCall.set(null);
            this.cleanupCall();
          }
          break;
      }
    });
  }

  private listenForSignals() {
    this.webSocketService.subscribeToTopic('/user/queue/calls.signal', async (signal: SignalRequest) => {
      const state = this.activeCall();
      if (!state || state.callId !== signal.callId) return;

      if (!this.peerConnection) {
        await this.startPeerConnection(false, state.isVideo); // Tạo connection nếu chưa có
      }

      if (signal.type === 'offer' && signal.sdp) {
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        
        this.webSocketService.sendMessage('/app/call.signal', {
          callId: state.callId,
          targetId: state.partnerId,
          type: 'answer',
          sdp: answer
        });
      } 
      else if (signal.type === 'answer' && signal.sdp) {
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } 
      else if (signal.type === 'candidate' && signal.candidate) {
        try {
          await this.peerConnection!.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });
  }

  public initiateCall(calleeId: number, isVideo: boolean = false) {
    if (this.activeCall()) return; // Đang có cuộc gọi khác
    this.webSocketService.sendMessage('/app/call.initiate', { receiverId: calleeId, isVideo });
    this.activeCall.set({
      callId: 0, // Sẽ được cập nhật khi nhận về từ server
      isIncoming: false,
      status: 'RINGING',
      partnerId: calleeId,
      isVideo: isVideo
    });
    this.playRingtone();
  }

  public acceptCall() {
    const state = this.activeCall();
    if (!state) return;
    
    this.startPeerConnection(false, state.isVideo);
    this.stopRingtone();
    this.webSocketService.sendMessage('/app/call.accept', { callId: state.callId });
    this.activeCall.update(s => s ? { ...s, status: 'ACCEPTED', startTime: new Date() } : null);
    // PeerConnection sẽ được khởi tạo khi nhận signal từ caller, hoặc có thể tạo trước
  }

  public rejectCall() {
    const state = this.activeCall();
    if (!state) return;
    
    this.webSocketService.sendMessage('/app/call.reject', { callId: state.callId });
    this.cleanupCall();
  }

  public cancelCall() {
    const state = this.activeCall();
    if (!state) return;

    this.webSocketService.sendMessage('/app/call.cancel', { callId: state.callId });
    this.cleanupCall();
  }

  public endCall() {
    const state = this.activeCall();
    if (!state) return;

    this.webSocketService.sendMessage('/app/call.end', { callId: state.callId });
    this.cleanupCall();
  }

  public toggleCamera() {
    const stream = this.localStream();
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  public isCameraOff(): boolean {
    const stream = this.localStream();
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      return videoTrack ? !videoTrack.enabled : true;
    }
    return true;
  }

  // --- WebRTC Logic ---
  private async startPeerConnection(isCaller: boolean, isVideo: boolean = false) {
    try {
      // Yêu cầu quyền Micro & Camera
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      this.localStream.set(stream);

      this.peerConnection = new RTCPeerConnection(this.iceServers);

      // Add luồng local vào PeerConnection
      stream.getTracks().forEach(track => {
        if (this.peerConnection) this.peerConnection.addTrack(track, stream);
      });

      // Lắng nghe luồng remote từ đối tác
      this.peerConnection.ontrack = (event) => {
        this.remoteStream.set(event.streams[0]);
      };

      // Gửi ICE candidate cho đối tác
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const state = this.activeCall();
          if (state) {
            this.webSocketService.sendMessage('/app/call.signal', {
              callId: state.callId,
              targetId: state.partnerId,
              type: 'candidate',
              candidate: event.candidate
            });
          }
        }
      };

      if (isCaller) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        const state = this.activeCall();
        if (state) {
          this.webSocketService.sendMessage('/app/call.signal', {
            callId: state.callId,
            targetId: state.partnerId,
            type: 'offer',
            sdp: offer
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi truy cập Micro hoặc WebRTC', err);
      this.endCall(); // Hủy gọi nếu lỗi
    }
  }

  public toggleMute() {
    const stream = this.localStream();
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return true;
  }

  public isMuted(): boolean {
    const stream = this.localStream();
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : false;
    }
    return false;
  }

  private cleanupCall() {
    this.activeCall.set(null);
    this.stopRingtone();
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    const local = this.localStream();
    if (local) {
      local.getTracks().forEach(t => t.stop());
      this.localStream.set(null);
    }
    this.remoteStream.set(null);
  }

  private ringtoneAudio = new Audio('https://res.cloudinary.com/ddizrhk7g/video/upload/v1789828138/nhac_chuong_cuoc_goi_Den-www_tiengdong_com_vetfm7.mp3');
  
  private playRingtone() {
    this.ringtoneAudio.loop = true;
    this.ringtoneAudio.play().catch(e => console.log('Autoplay prevented', e));
  }

  private stopRingtone() {
    this.ringtoneAudio.pause();
    this.ringtoneAudio.currentTime = 0;
  }
}
