package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.UpdateAdminUserRequest;
import com.myspace.myspace.dto.response.AdminUserResponse;

public interface AdminUsersService {
    PageResponse<AdminUserResponse> getUsers(String search, String role, String status, int page, int limit);
    AdminUserResponse getUserById(Long id);
    AdminUserResponse updateUser(Long id, UpdateAdminUserRequest request);
}
