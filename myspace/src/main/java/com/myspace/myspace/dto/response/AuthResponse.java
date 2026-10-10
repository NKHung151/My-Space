package com.myspace.myspace.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private CurrentUserResponse user;
   
    @JsonIgnore
    private String refreshToken;
}
