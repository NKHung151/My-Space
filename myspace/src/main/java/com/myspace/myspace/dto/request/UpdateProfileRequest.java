package com.myspace.myspace.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Tên hiển thị không được để trống")
    @Size(max = 50, message = "Tên hiển thị không được vượt quá 50 ký tự")
    private String displayName;

    @NotBlank(message = "Tên người dùng không được để trống")
    @Pattern(regexp = "^[a-zA-Z0-9_]{3,30}$", message = "Tên người dùng phải từ 3-30 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới")
    private String username;

    @Size(max = 160, message = "Tiểu sử không được vượt quá 160 ký tự")
    private String bio;

    private String avatarMediaId;
}
