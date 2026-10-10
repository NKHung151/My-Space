package com.myspace.myspace.config;

import com.myspace.myspace.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        switch (accessor.getCommand()) {
            case CONNECT -> accessor.setUser(authenticate(accessor));
            case SEND, SUBSCRIBE -> {
                // Trước đây CONNECT không token vẫn được chấp nhận với user = null, rồi controller NPE khi gọi getUser()
                if (accessor.getUser() == null) {
                    throw new MessageDeliveryException("Unauthorized");
                }
                if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
                    checkSubscription(accessor.getDestination());
                }
            }
            default -> { }
        }
        return message;
    }

    private UsernamePasswordAuthenticationToken authenticate(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Missing access token");
        }
        String token = authHeader.substring(7);
        try {
            String username = jwtService.extractUsername(token);
            UserDetails userDetails = username != null ? userDetailsService.loadUserByUsername(username) : null;
            if (userDetails != null && jwtService.validateToken(token, userDetails) && userDetails.isEnabled()) {
                log.debug("User {} authenticated successfully in WebSocket connection", username);
                return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            }
        } catch (Exception e) {
            log.debug("Invalid WebSocket token: {}", e.getMessage());
        }
        // Từ chối CONNECT -> client nhận STOMP ERROR, tự kết nối lại sau khi refresh token
        throw new MessageDeliveryException("Invalid access token");
    }

    /**
     * Chỉ cho đăng ký kênh riêng của mình (/user/...) và kênh chung (/topic/...).
     * Đăng ký thẳng /queue/... là đi vào hàng đợi đã được định tuyến cho session khác.
     */
    private void checkSubscription(String destination) {
        if (destination == null || !(destination.startsWith("/user/") || destination.startsWith("/topic/"))) {
            throw new MessageDeliveryException("Forbidden destination: " + destination);
        }
    }
}
