package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.request.LoginRequest;
import com.myspace.myspace.common.dto.response.AuthResponse;
import com.myspace.myspace.common.dto.response.CurrentUserResponse;
import com.myspace.myspace.entity.RefreshToken;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        String accessToken = jwtService.generateToken(userDetails);

        // Tạo refresh token mới và lưu vào DB (Thay thế token cũ nếu có)
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

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

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .user(userResponse)
                .build();
    }
}

