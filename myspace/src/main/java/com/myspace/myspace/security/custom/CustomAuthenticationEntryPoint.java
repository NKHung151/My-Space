package com.myspace.myspace.security.custom;

import tools.jackson.databind.ObjectMapper;
import com.myspace.myspace.common.dto.ApiResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        // Cấu hình HTTP status và Content-Type
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        // Trả về JSON chuẩn theo cấu trúc ApiResponse của hệ thống thay vì dùng Map.toString() (gây lỗi format JSON)
        ApiResponse<Object> errorResponse = ApiResponse.error(401, "Bạn chưa đăng nhập hoặc token không hợp lệ!", null);
        
        // Ghi chuỗi JSON vào response
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
