package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.common.util.TextUtils;
import com.myspace.myspace.dto.request.LoginRequest;
import com.myspace.myspace.dto.request.RegisterRequest;
import com.myspace.myspace.dto.request.ResetPasswordRequest;
import com.myspace.myspace.dto.request.ChangePasswordRequest;
import com.myspace.myspace.dto.request.UpdateProfileRequest;
import com.myspace.myspace.dto.response.AuthResponse;
import com.myspace.myspace.dto.response.CurrentUserResponse;
import com.myspace.myspace.entity.Role;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.mapper.UserMapper;
import com.myspace.myspace.repository.FriendshipRepository;
import com.myspace.myspace.repository.MediaAssetRepository;
import com.myspace.myspace.repository.RoleRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.security.jwt.JwtService;
import com.myspace.myspace.service.AuthService;
import com.myspace.myspace.service.MailService;
import com.myspace.myspace.service.RefreshTokenService;
import com.myspace.myspace.service.UploadService;
import com.myspace.myspace.service.search.SearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
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
    private final UploadService uploadService;
    private final MediaAssetRepository mediaAssetRepository;
    private final FriendshipRepository friendshipRepository;
    private final SearchIndexService searchIndexService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_OTP_ATTEMPTS = 5;

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        String accessToken = jwtService.generateToken(userDetails);

        // Tạo phiên mới cho thiết bị này (không đụng tới phiên ở thiết bị khác)
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());

        CurrentUserResponse userResponse = UserMapper.toCurrentUser(user, friendshipRepository.countByUserId(user.getId()));

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
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
        user.setUnaccentedDisplayName(TextUtils.unaccent(request.getFullName()));
        user.setUsername(generatedUsername);
        user.setStatus("active");
        user.setRole(userRole);

        userRepository.save(user);
        searchIndexService.indexUser(user);

        // Đăng nhập luôn sau khi đăng ký thành công
        CustomUserDetails userDetails = new CustomUserDetails(user);
        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());

        CurrentUserResponse userResponse = UserMapper.toCurrentUser(user, 0);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(userResponse)
                .build();
    }

    @Override
    public void forgotPassword(String email) {
        // Email không tồn tại vẫn trả về thành công như bình thường -> không dò được email nào đã đăng ký
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }

        // Chặn gửi lại liên tục: OTP vừa được cấp trong RESEND_COOLDOWN thì bỏ qua (vẫn trả thành công)
        LocalDateTime now = LocalDateTime.now();
        if (user.getResetOtpExpiry() != null
                && user.getResetOtpExpiry().isAfter(now.plus(OTP_TTL).minus(RESEND_COOLDOWN))) {
            return;
        }

        // OTP 6 số sinh bằng SecureRandom (java.util.Random đoán được)
        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));

        user.setResetOtp(otp);
        user.setResetOtpExpiry(now.plus(OTP_TTL));
        user.setResetOtpAttempts(0);
        userRepository.save(user);

        // Gửi Email chứa mã OTP
        mailService.sendPasswordResetEmail(user.getEmail(), otp);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Mã đặt lại không hợp lệ hoặc đã hết hạn."));

        if (user.getResetOtp() == null || user.getResetOtpExpiry() == null
                || LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã đặt lại không hợp lệ hoặc đã hết hạn.");
        }

        // So sánh thời gian hằng định; sai thì tăng bộ đếm, quá MAX_OTP_ATTEMPTS thì hủy OTP
        boolean matches = MessageDigest.isEqual(
                user.getResetOtp().getBytes(StandardCharsets.UTF_8),
                String.valueOf(request.getOtp()).getBytes(StandardCharsets.UTF_8));
        if (!matches) {
            int attempts = (user.getResetOtpAttempts() == null ? 0 : user.getResetOtpAttempts()) + 1;
            if (attempts >= MAX_OTP_ATTEMPTS) {
                clearResetOtp(user);
                userRepository.save(user);
                throw new AppException(HttpStatus.BAD_REQUEST, "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");
            }
            user.setResetOtpAttempts(attempts);
            userRepository.save(user);
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã đặt lại không hợp lệ hoặc đã hết hạn.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        clearResetOtp(user);
        
        userRepository.save(user);
        
        // Thu hồi toàn bộ token để bắt buộc đăng nhập lại trên mọi thiết bị
        refreshTokenService.revokeAllUserTokens(user.getId());
    }

    private void clearResetOtp(User user) {
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        user.setResetOtpAttempts(0);
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

    @Override
    public CurrentUserResponse updateProfile(String userEmail, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        if (!user.getUsername().equals(request.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(HttpStatus.CONFLICT, "Tên người dùng đã được sử dụng!");
        }

        user.setDisplayName(request.getDisplayName());
        user.setUsername(request.getUsername());
        user.setBio(request.getBio());

        String newAvatarUrl = request.getAvatarMediaId() != null ? request.getAvatarMediaId().trim() : "";
        if (!newAvatarUrl.isEmpty() && !newAvatarUrl.equals(user.getAvatarUrl())) {
            // Avatar phải là ảnh do chính user upload qua /api/uploads/avatar.
            // Nếu nhận URL tùy ý, user có thể lấy ảnh của người khác làm avatar rồi đổi avatar để xóa ảnh đó.
            Long userId = user.getId();
            boolean ownedImage = mediaAssetRepository.findFirstByUrl(newAvatarUrl)
                    .filter(asset -> asset.getOwner().getId().equals(userId))
                    .filter(asset -> "image".equals(asset.getMediaType()))
                    .isPresent();
            if (!ownedImage) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Ảnh đại diện không hợp lệ.");
            }
            if (user.getAvatarUrl() != null) {
                uploadService.deleteEditorMedia(user.getAvatarUrl(), user.getId());
            }
            user.setAvatarUrl(newAvatarUrl);
        }

        // Tạo tên không dấu để dễ tìm kiếm
        user.setUnaccentedDisplayName(TextUtils.unaccent(request.getDisplayName()));

        user = userRepository.save(user);
        searchIndexService.indexUser(user);

        // Trả đầy đủ thông tin (trước đây thiếu email/role/bio; FE ghi đè cả object user nên mất role tới khi tải lại)
        return UserMapper.toCurrentUser(user, friendshipRepository.countByUserId(user.getId()));
    }
}

