package com.myspace.myspace.service.impl;

import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.mapper.CallMapper;
import com.myspace.myspace.dto.response.CallBroadcastResult;
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
        if (calleeId == null || callerId.equals(calleeId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể gọi cho chính mình.");
        }
        User caller = userRepository.getReferenceById(callerId);
        User callee = userRepository.findById(calleeId).orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        
        Conversation conversation = messageService.getOrCreateConversation(callerId, calleeId);

        Call call = new Call();
        call.setConversation(conversation);
        call.setCaller(caller);
        call.setCallee(callee);
        call.setStatus(Call.CallStatus.RINGING);
        call.setIsVideo(isVideo);
        call = callRepository.save(call);

        return new CallBroadcastResult(CallMapper.toResponse(call, "incoming"), callee.getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult acceptCall(Long callId, Long calleeId) {
        Call call = getCallAndValidate(callId);
        if (!call.getCallee().getId().equals(calleeId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này với cuộc gọi.");
        }
        requireStatus(call, Call.CallStatus.RINGING);
        
        call.setStatus(Call.CallStatus.ACCEPTED);
        call.setAnsweredAt(LocalDateTime.now());
        call = callRepository.save(call);

        return new CallBroadcastResult(CallMapper.toResponse(call, "accepted"), call.getCaller().getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult rejectCall(Long callId, Long calleeId) {
        Call call = getCallAndValidate(callId);
        if (!call.getCallee().getId().equals(calleeId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này với cuộc gọi.");
        }
        requireStatus(call, Call.CallStatus.RINGING);

        call.setStatus(Call.CallStatus.REJECTED);
        call.setEndReason(Call.CallEndReason.CALLEE_REJECT);
        call.setEndedAt(LocalDateTime.now());
        call = callRepository.save(call);

        return new CallBroadcastResult(CallMapper.toResponse(call, "rejected"), call.getCaller().getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult cancelCall(Long callId, Long callerId) {
        Call call = getCallAndValidate(callId);
        if (!call.getCaller().getId().equals(callerId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này với cuộc gọi.");
        }
        requireStatus(call, Call.CallStatus.RINGING);

        call.setStatus(Call.CallStatus.CANCELLED);
        call.setEndReason(Call.CallEndReason.CALLER_CANCEL);
        call.setEndedAt(LocalDateTime.now());
        call = callRepository.save(call);

        return new CallBroadcastResult(CallMapper.toResponse(call, "cancelled"), call.getCallee().getEmail());
    }

    @Override
    @Transactional
    public CallBroadcastResult endCall(Long callId, Long userId) {
        Call call = getCallAndValidate(callId);
        
        boolean isCaller = call.getCaller().getId().equals(userId);
        boolean isCallee = call.getCallee().getId().equals(userId);
        
        if (!isCaller && !isCallee) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này với cuộc gọi.");
        }
        requireStatus(call, Call.CallStatus.RINGING, Call.CallStatus.ACCEPTED);

        call.setStatus(Call.CallStatus.ENDED);
        call.setEndReason(Call.CallEndReason.NORMAL);
        call.setEndedAt(LocalDateTime.now());
        
        if (call.getAnsweredAt() != null) {
            long duration = java.time.Duration.between(call.getAnsweredAt(), call.getEndedAt()).getSeconds();
            call.setDurationSeconds((int) duration);
        }
        
        call = callRepository.save(call);

        String receiverEmail = isCaller ? call.getCallee().getEmail() : call.getCaller().getEmail();
        return new CallBroadcastResult(CallMapper.toResponse(call, "ended"), receiverEmail);
    }

    /**
     * Tín hiệu WebRTC (offer/answer/ICE) chỉ được chuyển tới người còn lại của 1 cuộc gọi đang diễn ra.
     * Trước đây server forward tới targetId bất kỳ do client gửi -> ai cũng spam/giả tín hiệu tới người khác được.
     */
    @Override
    @Transactional(readOnly = true)
    public String resolveSignalTarget(Long callId, Long senderId) {
        Call call = getCallAndValidate(callId);
        requireStatus(call, Call.CallStatus.RINGING, Call.CallStatus.ACCEPTED);
        if (call.getCaller().getId().equals(senderId)) return call.getCallee().getEmail();
        if (call.getCallee().getId().equals(senderId)) return call.getCaller().getEmail();
        throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này với cuộc gọi.");
    }

    // Máy trạng thái: chỉ chuyển trạng thái hợp lệ (vd. không "nhận" cuộc gọi đã kết thúc, không kết thúc 2 lần
    // -> trước đây mỗi lần gọi end/reject lại sinh thêm 1 tin nhắn hệ thống trong chat)
    private static void requireStatus(Call call, Call.CallStatus... allowed) {
        for (Call.CallStatus status : allowed) {
            if (call.getStatus() == status) return;
        }
        throw new AppException(HttpStatus.CONFLICT, "Cuộc gọi không còn ở trạng thái phù hợp (" + call.getStatus() + ").");
    }

    private Call getCallAndValidate(Long callId) {
        return callRepository.findById(callId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy cuộc gọi."));
    }

}
