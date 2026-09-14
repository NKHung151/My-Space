package com.myspace.myspace.common.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private CurrentUserResponse user;
   
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String refreshToken;
}
