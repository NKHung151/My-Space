package com.myspace.myspace.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateCommentRequest {
    @NotBlank(message = "Comment content must not be empty")
    private String content;
}
