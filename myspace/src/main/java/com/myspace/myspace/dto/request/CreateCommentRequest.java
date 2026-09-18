package com.myspace.myspace.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCommentRequest {
    @NotBlank(message = "Comment content must not be empty")
    private String content;
    
    private Long parentId;
    
    private Long replyToCommentId;
}
