package com.myspace.myspace.service;

import com.myspace.myspace.dto.response.CallBroadcastResult;

public interface CallService {
    CallBroadcastResult initiateCall(Long callerId, Long calleeId, Boolean isVideo);
    CallBroadcastResult acceptCall(Long callId, Long calleeId);
    CallBroadcastResult rejectCall(Long callId, Long calleeId);
    CallBroadcastResult cancelCall(Long callId, Long callerId);
    CallBroadcastResult endCall(Long callId, Long userId);
}
