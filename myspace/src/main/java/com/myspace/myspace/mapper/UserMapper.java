package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.CurrentUserResponse;
import com.myspace.myspace.entity.User;

public final class UserMapper {

    private UserMapper() {}

    // Thông tin đầy đủ của người đang đăng nhập — dùng chung cho login, register, getMe, cập nhật hồ sơ.
    public static CurrentUserResponse toCurrentUser(User user, long friendsCount) {
        return CurrentUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .friendsCount(friendsCount)
                .build();
    }
}
