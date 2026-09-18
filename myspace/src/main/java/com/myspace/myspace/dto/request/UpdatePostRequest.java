package com.myspace.myspace.dto.request;

import lombok.Data;

@Data
public class UpdatePostRequest {
    private String title;
    private String excerpt;
    private String content;
    private String coverImageUrl;
    private Boolean hasVideo;
    private String tag;
}
