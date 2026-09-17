package com.myspace.myspace.dto.request;

import com.myspace.myspace.common.constant.ValidationConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    private String currentPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Pattern(regexp = ValidationConstants.PASSWORD_REGEX, message = "Mật khẩu phải từ 8-72 ký tự, chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt")
    private String newPassword;
}
