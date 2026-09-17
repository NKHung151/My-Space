package com.myspace.myspace.dto.request;

import com.myspace.myspace.common.constant.ValidationConstants;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mã OTP không được để trống")
    @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải bao gồm 6 chữ số")
    private String otp;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Pattern(regexp = ValidationConstants.PASSWORD_REGEX, message = "Mật khẩu phải từ 8-72 ký tự, chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt")
    private String newPassword;
}
