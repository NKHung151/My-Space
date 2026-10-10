package com.myspace.myspace.mapper;

import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.dto.response.AdminUserResponse;
import com.myspace.myspace.dto.response.CurrentUserResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.User;

/** Chuyển User (entity / tài liệu Elasticsearch) sang các DTO hiển thị. */
public final class UserMapper {

    private UserMapper() {}

    /** Thông tin đầy đủ của người đang đăng nhập — dùng chung cho login, register, getMe, cập nhật hồ sơ. */
    public static CurrentUserResponse toCurrentUser(User user, long friendsCount) {
        return CurrentUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(roleName(user))
                .friendsCount(friendsCount)
                .build();
    }

    /** Thông tin công khai (tác giả bài viết, bình luận, bạn bè, hồ sơ). isFriend/friendsCount do service điền nếu cần. */
    public static PublicUserResponse toPublicUser(User user) {
        return PublicUserResponse.builder()
                .id(user.getId())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(user.getRole() != null ? user.getRole().getName() : "member")
                .build();
    }

    /** Kết quả tìm kiếm user từ Elasticsearch. */
    public static PublicUserResponse toPublicUser(UserDocument doc) {
        return PublicUserResponse.builder()
                .id(doc.getId())
                .displayName(doc.getDisplayName() != null ? doc.getDisplayName() : doc.getUsername())
                .username(doc.getUsername())
                .avatarUrl(doc.getAvatarUrl())
                .bio(doc.getBio())
                .role(doc.getRole())
                .build();
    }

    public static AdminUserResponse toAdminUser(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .role(roleName(user))
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public static UserDocument toDocument(User user) {
        return UserDocument.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .role(roleName(user))
                .build();
    }

    private static String roleName(User user) {
        return user.getRole() != null ? user.getRole().getName() : null;
    }
}
