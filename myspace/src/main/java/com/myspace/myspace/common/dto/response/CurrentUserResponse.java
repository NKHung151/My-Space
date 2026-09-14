package com.myspace.myspace.common.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CurrentUserResponse {
    private Long id;
    private String email;
    private String username;
    private String fullName;
    private String displayName;
    private String avatarUrl;
    private String accentColor;
    private String bio;
    private String role;
}
