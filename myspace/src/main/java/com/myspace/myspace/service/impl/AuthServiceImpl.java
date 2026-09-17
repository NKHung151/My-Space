package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.dto.request.ChangePasswordRequest;
import com.myspace.myspace.dto.request.LoginRequest;
import com.myspace.myspace.dto.request.RegisterRequest;
import com.myspace.myspace.dto.request.ResetPasswordRequest;
import com.myspace.myspace.dto.response.AuthResponse;
import com.myspace.myspace.dto.response.CurrentUserResponse;
import com.myspace.myspace.entity.RefreshToken;
import com.myspace.myspace.entity.Role;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.RoleRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.security.jwt.JwtService;
import com.myspace.myspace.service.AuthService;
import com.myspace.myspace.service.MailService;
import com.myspace.myspace.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final MailService mailService;
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

    @Override
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với email này."));

        // Tạo ngẫu nhiên mã OTP 6 số
        String otp = String.format("%06d", new Random().nextInt(1000000));
        
        user.setResetOtp(otp);
        user.setResetOtpExpiry(LocalDateTime.now().plusMinutes(5)); // Mã OTP có hiệu lực trong 5 phút
        userRepository.save(user);

        // Gửi Email chứa mã OTP
        mailService.sendPasswordResetEmail(user.getEmail(), otp);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Mã đặt lại không hợp lệ hoặc đã hết hạn."));

        if (user.getResetOtp() == null || !user.getResetOtp().equals(request.getOtp())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã đặt lại không hợp lệ hoặc đã hết hạn.");
        }

        if (user.getResetOtpExpiry() == null || LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã đặt lại không hợp lệ hoặc đã hết hạn.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        
        userRepository.save(user);
        
        // Thu hồi toàn bộ token để bắt buộc đăng nhập lại trên mọi thiết bị
        refreshTokenService.revokeAllUserTokens(user.getId());
    }

    @Override
    public void changePassword(String userEmail, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Thu hồi toàn bộ token để bắt buộc đăng nhập lại bằng mật khẩu mới
        refreshTokenService.revokeAllUserTokens(user.getId());
    }

    @Override
    public void logoutAll(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        
        // Xóa toàn bộ Refresh Token của người dùng này khỏi hệ thống
        refreshTokenService.revokeAllUserTokens(user.getId());
    }
}

