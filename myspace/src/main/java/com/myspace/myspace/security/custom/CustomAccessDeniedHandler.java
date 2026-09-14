package com.myspace.myspace.security.custom;

import tools.jackson.databind.ObjectMapper;
import com.myspace.myspace.common.dto.ApiResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException, ServletException {
        // Cấu hình HTTP status và Content-Type
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        // Trả về JSON chuẩn theo cấu trúc ApiResponse của hệ thống
        ApiResponse<Object> errorResponse = ApiResponse.error(403, "Bạn không có quyền truy cập!", null);
        
        // Ghi chuỗi JSON vào response
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
