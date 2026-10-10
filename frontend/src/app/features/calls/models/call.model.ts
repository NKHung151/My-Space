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
