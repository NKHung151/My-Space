package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.entity.RefreshToken;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.RefreshTokenRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    // Nhiều tab cùng refresh gần như đồng thời sẽ cùng gửi token cũ; trong khoảng này không coi là bị đánh cắp
    private static final Duration ROTATION_GRACE = Duration.ofSeconds(30);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${jwt.refresh-token.expiration}")
    private Long refreshTokenExpirationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public String createRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));
        return issue(user);
    }

    @Override
    @Transactional(noRollbackFor = AppException.class)
    public Rotation rotate(String rawToken) {
        RefreshToken current = refreshTokenRepository.findByToken(hash(rawToken))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ!"));
        User user = current.getUser();

        if (current.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(current);
            throw new AppException(HttpStatus.UNAUTHORIZED, "Refresh token đã hết hạn! Vui lòng đăng nhập lại.");
        }

        if (current.isRevoked()) {
            boolean withinGrace = current.getRotatedAt() != null
                    && current.getRotatedAt().plus(ROTATION_GRACE).isAfter(Instant.now());
            if (!withinGrace) {
                // Token đã đổi từ lâu mà vẫn bị dùng lại → khả năng bị đánh cắp: thu hồi mọi phiên của user
                log.warn("Refresh token reuse detected for user {}, revoking all sessions", user.getId());
                refreshTokenRepository.deleteAllByUserId(user.getId());
                throw new AppException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
            }
        } else {
            current.setRevoked(true);
            current.setRotatedAt(Instant.now());
            refreshTokenRepository.save(current);
        }

        return new Rotation(user, issue(user));
    }

    @Override
    @Transactional
    public void revokeToken(String rawToken) {
        refreshTokenRepository.findByToken(hash(rawToken)).ifPresent(refreshTokenRepository::delete);
    }

    @Override
    @Transactional
    public void revokeAllUserTokens(Long userId) {
        refreshTokenRepository.deleteAllByUserId(userId);
    }

    /** Dọn token hết hạn mỗi ngày (bảng không còn bị xóa sạch mỗi lần đăng nhập nên cần dọn định kỳ). */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredTokens() {
        int deleted = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
        if (deleted > 0) log.info("Purged {} expired refresh tokens", deleted);
    }

    private String issue(User user) {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(hash(raw)) // DB chỉ lưu SHA-256, lộ DB không dùng được token
                .expiryDate(Instant.now().plusMillis(refreshTokenExpirationMs))
                .revoked(false)
                .build());
        return raw;
    }

    private static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
