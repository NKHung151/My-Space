package com.myspace.myspace.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePostRequest {
    @NotBlank(message = "Title is required")
    private String title;
    private String excerpt;
    private String content;
    private String coverImageUrl;
    private Boolean hasVideo;
    private String tag;
    private boolean publish;
}
