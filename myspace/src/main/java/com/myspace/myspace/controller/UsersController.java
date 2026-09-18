package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.UsersService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UsersController {

    private final UsersService usersService;

    @GetMapping("/recommended")
    public ResponseEntity<ApiResponse<PageResponse<PublicUserResponse>>> getRecommended(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long currentUserId = userDetails != null ? userDetails.getUser().getId() : null;
        PageResponse<PublicUserResponse> response = usersService.getRecommendedUsers(currentUserId, q, page, limit);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PublicUserResponse>> getProfile(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long currentUserId = userDetails != null ? userDetails.getUser().getId() : null;
        PublicUserResponse response = usersService.getProfile(currentUserId, id);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
