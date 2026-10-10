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
    // Module Friends/Users sẽ populate 2 field này; module Posts để mặc định false/0
    // Lombok sinh getter isFriend() nên Jackson mặc định đặt tên JSON là "friend" — giữ đúng tên "isFriend"
    @com.fasterxml.jackson.annotation.JsonProperty("isFriend")
    private boolean isFriend;
    private Long friendsCount;
}
