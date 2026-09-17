package com.myspace.myspace.service;

import com.myspace.myspace.dto.request.LoginRequest;
import com.myspace.myspace.dto.request.RegisterRequest;
import com.myspace.myspace.dto.request.ResetPasswordRequest;
import com.myspace.myspace.dto.request.ChangePasswordRequest;
import com.myspace.myspace.dto.request.UpdateProfileRequest;
import com.myspace.myspace.dto.response.AuthResponse;
import com.myspace.myspace.dto.response.CurrentUserResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
    void forgotPassword(String email);
    void resetPassword(ResetPasswordRequest request);
    void changePassword(String userEmail, ChangePasswordRequest request);
    void logoutAll(String userEmail);
    CurrentUserResponse updateProfile(String userEmail, UpdateProfileRequest request);
}
