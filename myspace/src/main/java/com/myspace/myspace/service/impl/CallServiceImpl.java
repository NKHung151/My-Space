package com.myspace.myspace.service.impl;

import com.myspace.myspace.dto.response.CallBroadcastResult;
import com.myspace.myspace.dto.response.CallResponse;
import com.myspace.myspace.entity.Call;
import com.myspace.myspace.entity.Conversation;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.CallRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.CallService;
import com.myspace.myspace.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CallServiceImpl implements CallService {

    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final MessageService messageService;

    @Override
    @Transactional
    public CallBroadcastResult initiateCall(Long callerId, Long calleeId, Boolean isVideo) {
        User caller = userRepository.getReferenceById(callerId);
        User callee = userRepository.findById(calleeId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Conversation conversation = messageService.getOrCreateConversation(callerId, calleeId);

        Call call = new Call();
        call.setConversation(conversation);
        call.setCaller(caller);
        call.setCallee(callee);
        call.setStatus(Call.CallStatus.RINGING);
        call.setIsVideo(isVideo);
        call = callRepository.save(call);

        return new CallBroadcastResult(mapToResponse(call, "incoming"), callee.getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult acceptCall(Long callId, Long calleeId) {
        Call call = getCallAndValidate(callId);
        if (!call.getCallee().getId().equals(calleeId)) {
            throw new IllegalArgumentException("Unauthorized");
        }
        
        call.setStatus(Call.CallStatus.ACCEPTED);
        call.setAnsweredAt(LocalDateTime.now());
        call = callRepository.save(call);

        return new CallBroadcastResult(mapToResponse(call, "accepted"), call.getCaller().getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult rejectCall(Long callId, Long calleeId) {
        Call call = getCallAndValidate(callId);
        if (!call.getCallee().getId().equals(calleeId)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        call.setStatus(Call.CallStatus.REJECTED);
        call.setEndReason(Call.CallEndReason.CALLEE_REJECT);
        call.setEndedAt(LocalDateTime.now());
        call = callRepository.save(call);

        return new CallBroadcastResult(mapToResponse(call, "rejected"), call.getCaller().getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult cancelCall(Long callId, Long callerId) {
        Call call = getCallAndValidate(callId);
        if (!call.getCaller().getId().equals(callerId)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        call.setStatus(Call.CallStatus.CANCELLED);
        call.setEndReason(Call.CallEndReason.CALLER_CANCEL);
        call.setEndedAt(LocalDateTime.now());
        call = callRepository.save(call);

        return new CallBroadcastResult(mapToResponse(call, "cancelled"), call.getCallee().getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult endCall(Long callId, Long userId) {
        Call call = getCallAndValidate(callId);
        
        boolean isCaller = call.getCaller().getId().equals(userId);
        boolean isCallee = call.getCallee().getId().equals(userId);
        
        if (!isCaller && !isCallee) {
            throw new IllegalArgumentException("Unauthorized");
        }

        call.setStatus(Call.CallStatus.ENDED);
        call.setEndReason(Call.CallEndReason.NORMAL);
        call.setEndedAt(LocalDateTime.now());
        
        if (call.getAnsweredAt() != null) {
            long duration = java.time.Duration.between(call.getAnsweredAt(), call.getEndedAt()).getSeconds();
            call.setDurationSeconds((int) duration);
        }
        
        call = callRepository.save(call);

        String receiverEmail = isCaller ? call.getCallee().getEmail() : call.getCaller().getEmail();
        return new CallBroadcastResult(mapToResponse(call, "ended"), receiverEmail);
    }

    private Call getCallAndValidate(Long callId) {
        return callRepository.findById(callId)
                .orElseThrow(() -> new IllegalArgumentException("Call not found"));
    }

    private CallResponse mapToResponse(Call call, String actionType) {
        return CallResponse.builder()
                .id(call.getId())
                .callerId(call.getCaller().getId())
                .calleeId(call.getCallee().getId())
                .status(call.getStatus().name())
                .type(actionType)
                .isVideo(call.getIsVideo())
                .createdAt(call.getCreatedAt())
                .build();
    }
}
