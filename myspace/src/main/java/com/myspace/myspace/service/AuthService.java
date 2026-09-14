package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.request.LoginRequest;
import com.myspace.myspace.common.dto.response.AuthResponse;
import com.myspace.myspace.common.dto.response.CurrentUserResponse;
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

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        User user = userDetails.getUser();
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
                .refreshToken(refreshToken)
                .user(userResponse)
                .build();
    }
}
