package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;

public final class PostMapper {

    private PostMapper() {}

    /** Map Post → PostResponse (dùng cho danh sách, không kèm content đầy đủ). */
    public static PostResponse toResponse(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(post.getExcerpt())
                .coverImageUrl(post.getCoverImageUrl())
                .hasVideo(post.getHasVideo())
                .tag(post.getTag())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .author(toPublicUser(post.getAuthor()))
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .build();
    }

    /** Map Post → PostDetailResponse (dùng cho xem chi tiết, kèm content đầy đủ). */
    public static PostDetailResponse toDetailResponse(Post post) {
        return PostDetailResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(post.getExcerpt())
                .content(post.getContent())
                .coverImageUrl(post.getCoverImageUrl())
                .hasVideo(post.getHasVideo())
                .tag(post.getTag())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .author(toPublicUser(post.getAuthor()))
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    /** Map User → PublicUserResponse (thông tin tác giả hiển thị công khai). */
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
}
