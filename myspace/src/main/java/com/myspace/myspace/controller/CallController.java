package com.myspace.myspace.controller;

import com.myspace.myspace.dto.request.CallActionRequest;
import com.myspace.myspace.dto.request.SignalRequest;
import com.myspace.myspace.dto.response.CallBroadcastResult;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.dto.response.MessageBroadcastResult;
import com.myspace.myspace.service.MessageService;
import com.myspace.myspace.service.CallService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class CallController {

    private final CallService callService;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/call.initiate")
    public void initiateCall(@Payload CallActionRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long callerId = getUserId(headerAccessor);
        String callerEmail = getUserEmail(headerAccessor);

        CallBroadcastResult result = callService.initiateCall(callerId, request.getReceiverId());

        // Gửi thông báo đến người nhận
        messagingTemplate.convertAndSendToUser(result.getReceiverEmail(), "/queue/calls", result.getCall());
        // Trả lại cho người gọi để biết callId (cùng dữ liệu nhưng type = "initiated")
        result.getCall().setType("initiated");
        messagingTemplate.convertAndSendToUser(callerEmail, "/queue/calls", result.getCall());
    }

    @MessageMapping("/call.accept")
    public void acceptCall(@Payload CallActionRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long calleeId = getUserId(headerAccessor);
        CallBroadcastResult result = callService.acceptCall(request.getCallId(), calleeId);
        messagingTemplate.convertAndSendToUser(result.getReceiverEmail(), "/queue/calls", result.getCall());
    }

    @MessageMapping("/call.reject")
    public void rejectCall(@Payload CallActionRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long calleeId = getUserId(headerAccessor);
        CallBroadcastResult result = callService.rejectCall(request.getCallId(), calleeId);
        messagingTemplate.convertAndSendToUser(result.getReceiverEmail(), "/queue/calls", result.getCall());
        broadcastCallMessage(request.getCallId(), getUserEmail(headerAccessor), result.getReceiverEmail());
    }

    @MessageMapping("/call.cancel")
    public void cancelCall(@Payload CallActionRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long callerId = getUserId(headerAccessor);
        CallBroadcastResult result = callService.cancelCall(request.getCallId(), callerId);
        messagingTemplate.convertAndSendToUser(result.getReceiverEmail(), "/queue/calls", result.getCall());
        broadcastCallMessage(request.getCallId(), getUserEmail(headerAccessor), result.getReceiverEmail());
    }

    @MessageMapping("/call.end")
    public void endCall(@Payload CallActionRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        CallBroadcastResult result = callService.endCall(request.getCallId(), userId);
        messagingTemplate.convertAndSendToUser(result.getReceiverEmail(), "/queue/calls", result.getCall());
        broadcastCallMessage(request.getCallId(), getUserEmail(headerAccessor), result.getReceiverEmail());
    }

    private void broadcastCallMessage(Long callId, String email1, String email2) {
        MessageBroadcastResult msgResult = messageService.saveCallSystemMessage(callId);
        messagingTemplate.convertAndSendToUser(email1, "/queue/messages", msgResult.getMessage());
        messagingTemplate.convertAndSendToUser(email2, "/queue/messages", msgResult.getMessage());
    }

    @MessageMapping("/call.signal")
    public void handleSignal(@Payload SignalRequest request, SimpMessageHeaderAccessor headerAccessor) {
        // Chỉ forward WebRTC signals (offer, answer, candidates) cho người kia
        // Không lưu vào DB vì chúng rất nhiều và chỉ dùng cho ICE negotiation
        User target = userRepository.findById(request.getTargetId()).orElse(null);
        if (target != null) {
            messagingTemplate.convertAndSendToUser(target.getEmail(), "/queue/calls.signal", request);
        }
    }

    private Long getUserId(SimpMessageHeaderAccessor headerAccessor) {
        UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) headerAccessor.getUser();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        return userDetails.getUser().getId();
    }

    private String getUserEmail(SimpMessageHeaderAccessor headerAccessor) {
        UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) headerAccessor.getUser();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        return userDetails.getUsername();
    }
}
