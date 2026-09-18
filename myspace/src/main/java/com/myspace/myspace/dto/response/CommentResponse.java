package com.myspace.myspace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private Long postId;
    private PublicUserResponse author;

    private Long parentId;
    private Long replyToCommentId;
    private Long replyToUserId;
    private String replyToDisplayName;

    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<CommentResponse> replies;
    private Integer likeCount;
    private Boolean liked; // Is liked by current user

    private CommentPermissions permissions;

    @Data
    @Builder
    public static class CommentPermissions {
        private Boolean canEdit;
        private Boolean canDelete;
    }
}
