package com.myspace.myspace.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PublicUserResponse {
    private Long id;
    private String displayName;
    private String username;
    private String avatarUrl;
    private String bio;
    private String role;
    private boolean isFriend;
    private Long friendsCount;
}
