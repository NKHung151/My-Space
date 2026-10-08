package com.myspace.myspace.service;

import com.myspace.myspace.entity.User;

public interface RefreshTokenService {

    /** Kết quả xoay vòng: user sở hữu phiên và refresh token mới (dạng gốc, để đặt vào cookie). */
    record Rotation(User user, String newToken) {}

    /** Tạo phiên mới cho 1 thiết bị, trả về token gốc. Không ảnh hưởng phiên ở thiết bị khác. */
    String createRefreshToken(Long userId);

    /** Đổi token cũ lấy token mới; token không hợp lệ / hết hạn / bị dùng lại → AppException 401. */
    Rotation rotate(String rawToken);

    /** Đăng xuất thiết bị hiện tại. */
    void revokeToken(String rawToken);

    /** Đăng xuất mọi thiết bị. */
    void revokeAllUserTokens(Long userId);
}
