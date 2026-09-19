package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.MessageRequest;
import com.myspace.myspace.dto.response.MessageResponse;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.myspace.myspace.repository.UserRepository userRepository;

    @GetMapping("/conversations/{targetUserId}")
    public ResponseEntity<ApiResponse<Long>> getConversationId(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long targetUserId) {
        Long conversationId = messageService.getOrCreateConversation(userDetails.getUser().getId(), targetUserId).getId();
        return ResponseEntity.ok(ApiResponse.success(conversationId));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<PageResponse<MessageResponse>>> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResponse<MessageResponse> messages = messageService.getConversationMessages(conversationId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload MessageRequest request, SimpMessageHeaderAccessor headerAccessor) {
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth = 
            (org.springframework.security.authentication.UsernamePasswordAuthenticationToken) headerAccessor.getUser();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        
        Long senderId = userDetails.getUser().getId();
        String senderEmail = userDetails.getUsername();
        
        MessageResponse message = messageService.saveMessage(senderId, request.getReceiverId(), request.getContent());
        
        // Send to receiver
        User receiver = userRepository.findById(request.getReceiverId()).orElseThrow(() -> new IllegalArgumentException("User not found"));
        messagingTemplate.convertAndSendToUser(
                receiver.getEmail(),
                "/queue/messages",
                message
        );
        
        // Send to sender (to update their other tabs if any, or acknowledge)
        messagingTemplate.convertAndSendToUser(
                senderEmail,
                "/queue/messages",
                message
        );
    }
}
