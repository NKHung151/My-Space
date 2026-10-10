package com.myspace.myspace.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.web.bind.annotation.ControllerAdvice;

import java.util.Map;

// Lỗi trong các handler @MessageMapping (chat, gọi điện) không đi qua GlobalExceptionHandler.
// trước đây chỉ nằm trong log server, client không biết thao tác thất bại.
// Giờ gửi về kênh riêng /user/queue/errors của người gửi.
@Slf4j
@ControllerAdvice
public class WebSocketExceptionHandler {

    @MessageExceptionHandler(AppException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, String> handleBusinessError(AppException ex) {
        return Map.of("message", ex.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, String> handleUnexpected(Exception ex) {
        log.error("Unhandled WebSocket message error", ex);
        return Map.of("message", "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
}
