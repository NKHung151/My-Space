package com.myspace.myspace.dto.request;

import lombok.Data;

@Data
public class UpdateAdminUserRequest {
    private String role;
    private String status;
}
