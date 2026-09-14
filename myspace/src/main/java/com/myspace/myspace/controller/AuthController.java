package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.request.LoginRequest;
import com.myspace.myspace.common.dto.response.CurrentUserResponse;
import com.myspace.myspace.common.dto.response.AuthResponse;
import com.myspace.myspace.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final com.myspace.myspace.repository.UserRepository userRepository;

    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpiration;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        
        // Tạo HttpOnly Cookie cho Refresh Token (Bảo mật tối đa, chống XSS)
        // Lấy thời gian sống (mili-giây) từ cấu hình chia cho 1000 để ra số Giây
        ResponseCookie springCookie = ResponseCookie.from("refresh_token", response.getRefreshToken())
                .httpOnly(true)
                .secure(false) // Đặt true nếu dùng HTTPS
                .path("/")
                .maxAge(refreshTokenExpiration / 1000) 
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, springCookie.toString())
                .body(ApiResponse.success(response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> getMe(Principal principal) {
        // Lấy thông tin user hiện tại từ Database dựa vào Email trong Token
        return userRepository.findByEmail(principal.getName())
                .map(user -> {
                    CurrentUserResponse userResponse = CurrentUserResponse.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .username(user.getUsername())
                            .fullName(user.getFullName())
                            .displayName(user.getDisplayName())
                            .avatarUrl(user.getAvatarUrl())
                            .accentColor(user.getAccentColor())
                            .bio(user.getBio())
                            .role(user.getRole().getName())
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(userResponse));
                })
                .orElseGet(() -> ResponseEntity.status(401).build());
    }
}
