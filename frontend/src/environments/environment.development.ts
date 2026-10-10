export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // STUN/TURN cho WebRTC. Thêm TURN server (vd. coturn) để gọi được qua NAT chặt:
  // { urls: 'turn:turn.example.com:3478', username: '...', credential: '...' }
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] as RTCIceServer[],
};
