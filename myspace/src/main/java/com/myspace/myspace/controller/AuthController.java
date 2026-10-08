package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.dto.request.LoginRequest;
import com.myspace.myspace.dto.response.CurrentUserResponse;
import com.myspace.myspace.dto.response.AuthResponse;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.security.jwt.JwtService;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.security.custom.CustomUserDetailsService;
import com.myspace.myspace.service.AuthService;
import com.myspace.myspace.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CustomUserDetailsService customUserDetailsService;

    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpiration;

    // true khi chạy HTTPS (production); dev chạy http://localhost nên mặc định false
    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    private static final String REFRESH_COOKIE = "refresh_token";

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody @jakarta.validation.Valid LoginRequest request) {
        AuthResponse response = authService.login(request);
        return generateAuthCookieResponse(response);
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody @jakarta.validation.Valid com.myspace.myspace.dto.request.RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return generateAuthCookieResponse(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestBody @jakarta.validation.Valid com.myspace.myspace.dto.request.ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Nếu email tồn tại, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư của bạn."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@RequestBody @jakarta.validation.Valid com.myspace.myspace.dto.request.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> changePassword(
            @RequestBody @jakarta.validation.Valid com.myspace.myspace.dto.request.ChangePasswordRequest request,
            Principal principal) {
        authService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.")));
    }

    @PostMapping("/logout-all")
    public ResponseEntity<ApiResponse<String>> logoutAll(Principal principal) {
        authService.logoutAll(principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Đã đăng xuất khỏi tất cả các thiết bị."));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> updateProfile(
            @RequestBody @jakarta.validation.Valid com.myspace.myspace.dto.request.UpdateProfileRequest request,
            Principal principal) {
        CurrentUserResponse response = authService.updateProfile(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> generateAuthCookieResponse(AuthResponse response) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(response.getRefreshToken(), refreshTokenExpiration / 1000))
                .body(ApiResponse.success(response));
    }

    private String refreshCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<Map<String, String>>> refreshToken(
            @CookieValue(name = "refresh_token", required = false) String refreshTokenStr) {

        if (refreshTokenStr == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "Refresh token không tồn tại!", null));
        }

        // Xoay vòng: token cũ bị thu hồi, client nhận token mới qua cookie
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(refreshTokenStr);

        // Load lại UserDetails từ DB để tạo Access Token mới
        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService
                .loadUserByUsername(rotation.user().getEmail());
        if (!userDetails.isEnabled()) {
            refreshTokenService.revokeAllUserTokens(userDetails.getUser().getId());
            return ResponseEntity.status(403)
                    .header(HttpHeaders.SET_COOKIE, refreshCookie("", 0))
                    .body(ApiResponse.error(403, "Tài khoản đã bị khóa.", null));
        }

        String newAccessToken = jwtService.generateToken(userDetails);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(rotation.newToken(), refreshTokenExpiration / 1000))
                .body(ApiResponse.success(Map.of("accessToken", newAccessToken)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshTokenStr,
            HttpServletResponse response) {

        // Chỉ đăng xuất thiết bị hiện tại; đăng xuất mọi thiết bị dùng /logout-all
        if (refreshTokenStr != null) {
            refreshTokenService.revokeToken(refreshTokenStr);
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie("", 0))
                .body(ApiResponse.success("Đăng xuất thành công!"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> getMe(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .map(user -> {
                    CurrentUserResponse userResponse = CurrentUserResponse.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .username(user.getUsername())
                            .fullName(user.getFullName())
                            .displayName(user.getDisplayName())
                            .avatarUrl(user.getAvatarUrl())
                            .bio(user.getBio())
                            .role(user.getRole().getName())
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(userResponse));
                })
                .orElseGet(() -> ResponseEntity.status(401).build());
    }
}
