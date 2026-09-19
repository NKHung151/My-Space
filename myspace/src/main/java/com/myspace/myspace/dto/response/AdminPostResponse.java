package com.myspace.myspace.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminPostResponse {
    private Long id;
    private String title;
    private String content;
    private AdminPostAuthorResponse author;
    private String tag;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class AdminPostAuthorResponse {
        private Long id;
        private String displayName;
        private String avatarUrl;
    }
}
