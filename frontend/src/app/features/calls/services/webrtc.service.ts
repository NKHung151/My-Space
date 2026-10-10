import { Injectable, inject, signal, effect } from '@angular/core';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';
import { ActiveCallState, CallResponse, SignalRequest } from '../models/call.model';

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
  
  // STUN/TURN lấy từ environment: mạng NAT chặt (4G, mạng công ty) cần TURN server mới gọi được
  private iceServers: RTCConfiguration = { iceServers: environment.iceServers };

  // Promise dùng chung cho đúng 1 RTCPeerConnection mỗi cuộc gọi. Trước đây acceptCall() và tín hiệu offer đến
  // gần như cùng lúc đều thấy peerConnection == null (getUserMedia còn đang chờ) -> tạo 2 kết nối, rò rỉ stream.
  private peerConnectionReady: Promise<RTCPeerConnection | null> | null = null;
  // ICE candidate đến trước khi có remote description sẽ bị addIceCandidate từ chối -> xếp hàng chờ
  private pendingCandidates: RTCIceCandidateInit[] = [];

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
              void this.ensurePeerConnection(true, state.isVideo);
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

      const pc = await this.ensurePeerConnection(false, state.isVideo);
      if (!pc || this.activeCall()?.callId !== signal.callId) return; // cuộc gọi đã kết thúc trong lúc chờ

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.webSocketService.sendMessage('/app/call.signal', {
          callId: state.callId,
          targetId: state.partnerId,
          type: 'answer',
          sdp: answer
        });
      } 
      else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.flushPendingCandidates(pc);
      } 
      else if (signal.type === 'candidate' && signal.candidate) {
        if (!pc.remoteDescription) {
          this.pendingCandidates.push(signal.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
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
    
    void this.ensurePeerConnection(false, state.isVideo);
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
  /** Trả về RTCPeerConnection của cuộc gọi hiện tại, tạo nếu chưa có — mọi nơi gọi cùng chờ 1 promise. */
  private ensurePeerConnection(isCaller: boolean, isVideo: boolean = false): Promise<RTCPeerConnection | null> {
    if (!this.peerConnectionReady) {
      this.peerConnectionReady = this.createPeerConnection(isCaller, isVideo);
    }
    return this.peerConnectionReady;
  }

  private async flushPendingCandidates(pc: RTCPeerConnection): Promise<void> {
    const candidates = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding queued ice candidate', e);
      }
    }
  }

  private async createPeerConnection(isCaller: boolean, isVideo: boolean = false): Promise<RTCPeerConnection | null> {
    try {
      // Yêu cầu quyền Micro & Camera
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });

      // Cuộc gọi đã kết thúc trong lúc chờ người dùng cấp quyền -> tắt camera/mic, không tạo kết nối
      if (!this.activeCall()) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
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
      return this.peerConnection;
    } catch (err) {
      console.error('Lỗi khi truy cập Micro hoặc WebRTC', err);
      this.endCall(); // Hủy gọi nếu lỗi
      return null;
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
    this.peerConnectionReady = null;
    this.pendingCandidates = [];
    
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
