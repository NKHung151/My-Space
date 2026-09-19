package com.myspace.myspace.config;

import com.myspace.myspace.dto.response.PresenceResponse;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        if (headerAccessor.getUser() != null) {
            String email = headerAccessor.getUser().getName();
            userRepository.findByEmail(email).ifPresent(user -> {
                boolean changed = presenceService.addOnlineUser(user.getId());
                if (changed) {
                    broadcastPresence(user.getId(), true);
                }
            });
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        if (headerAccessor.getUser() != null) {
            String email = headerAccessor.getUser().getName();
            userRepository.findByEmail(email).ifPresent(user -> {
                boolean changed = presenceService.removeOnlineUser(user.getId());
                if (changed) {
                    broadcastPresence(user.getId(), false);
                }
            });
        }
    }

    private void broadcastPresence(Long userId, boolean isOnline) {
        PresenceResponse response = new PresenceResponse(userId, isOnline);
        messagingTemplate.convertAndSend("/topic/presence", response);
    }
}
