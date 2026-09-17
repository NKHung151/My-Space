package com.myspace.myspace.service;

import com.myspace.myspace.dto.request.LoginRequest;
import com.myspace.myspace.dto.request.RegisterRequest;
import com.myspace.myspace.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
    void forgotPassword(String email);
}
