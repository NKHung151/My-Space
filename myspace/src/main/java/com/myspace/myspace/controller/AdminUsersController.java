package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.dto.request.UpdateAdminUserRequest;
import com.myspace.myspace.dto.response.AdminUserResponse;
import com.myspace.myspace.service.AdminUsersService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsersController {

    private final AdminUsersService adminUsersService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminUserResponse>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {
        PageResponse<AdminUserResponse> data = adminUsersService.getUsers(search, role, status, page, limit);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> getUserById(@PathVariable Long id) {
        AdminUserResponse data = adminUsersService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateAdminUserRequest request
    ) {
        AdminUserResponse data = adminUsersService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
