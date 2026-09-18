package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.CommentResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.Comment;
import com.myspace.myspace.entity.User;

public final class CommentMapper {
    private CommentMapper() {}

    public static CommentResponse toResponse(Comment comment, Long currentUserId, String currentUserRole) {
        if (comment == null) return null;

        User author = comment.getAuthor();
        PublicUserResponse authorResponse = PublicUserResponse.builder()
                .id(author.getId())
                .displayName(author.getDisplayName())
                .username(author.getUsername())
                .avatarUrl(author.getAvatarUrl())
                .build();

        Long replyToUserId = null;
        String replyToUsername = null;
        if (comment.getReplyToComment() != null) {
            replyToUserId = comment.getReplyToComment().getAuthor().getId();
            replyToUsername = comment.getReplyToComment().getAuthor().getUsername();
        }

        // Logic phân quyền (Permissions logic): 
        // 1. Tác giả có thể sửa bình luận của chính mình.
        // 2. Tác giả có thể xóa bình luận của chính mình.
        // 3. Chủ bài viết có thể xóa bất kỳ bình luận nào trên bài viết của họ.
        // 4. Admin có thể xóa bất kỳ bình luận nào.
        boolean isAuthor = currentUserId != null && currentUserId.equals(author.getId());
        boolean isPostAuthor = currentUserId != null && currentUserId.equals(comment.getPost().getAuthor().getId());
        boolean isAdmin = "admin".equalsIgnoreCase(currentUserRole);

        CommentResponse.CommentPermissions permissions = CommentResponse.CommentPermissions.builder()
                .canEdit(isAuthor)
                .canDelete(isAuthor || isPostAuthor || isAdmin)
                .build();

        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .author(authorResponse)
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .replyToCommentId(comment.getReplyToComment() != null ? comment.getReplyToComment().getId() : null)
                .replyToUserId(replyToUserId)
                .replyToUsername(replyToUsername)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .likeCount(comment.getLikeCount())
                .liked(false) // TODO: Sẽ được xử lý trong Module Likes (Thích)
                .permissions(permissions)
                .build();
    }
}
