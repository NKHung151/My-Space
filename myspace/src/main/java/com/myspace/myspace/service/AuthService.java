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
import org.springframework.security.crypto.password.PasswordEncoder;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.repository.RoleRepository;
import com.myspace.myspace.entity.Role;
import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.request.RegisterRequest;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

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
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, "Email này đã được sử dụng!");
        }

        Role userRole = roleRepository.findByName("user")
                .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy Role mặc định."));

        String generatedUsername = request.getEmail().split("@")[0] + "_" + UUID.randomUUID().toString().substring(0, 4);

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setDisplayName(request.getFullName());
        user.setUsername(generatedUsername);
        user.setStatus("ACTIVE");
        user.setRole(userRole);

        userRepository.save(user);

        // Đăng nhập luôn sau khi đăng ký thành công
        CustomUserDetails userDetails = new CustomUserDetails(user);
        String accessToken = jwtService.generateToken(userDetails);
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

