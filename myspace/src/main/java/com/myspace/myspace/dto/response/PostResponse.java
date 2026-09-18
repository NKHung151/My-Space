package com.myspace.myspace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PostResponse {
    private Long id;
    private String title;
    private String slug;
    private String excerpt;
    private String coverImageUrl;
    private Boolean hasVideo;
    private String tag;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private Boolean liked;
    private PublicUserResponse author;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}
