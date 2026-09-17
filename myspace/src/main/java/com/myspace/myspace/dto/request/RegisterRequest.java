package com.myspace.myspace.dto.request;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import com.myspace.myspace.common.constant.ValidationConstants;

@Data
public class RegisterRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Pattern(regexp = ValidationConstants.PASSWORD_REGEX, message = "Mật khẩu phải từ 8-72 ký tự, chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;
}
