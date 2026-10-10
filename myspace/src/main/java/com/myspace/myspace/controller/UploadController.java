package com.myspace.myspace.controller;

import org.springframework.http.ResponseEntity;
import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.dto.response.UploadResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @PostMapping("/media")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UploadResponse>> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UploadResponse response = uploadService.uploadMedia(file, currentUser.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UploadResponse>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UploadResponse response = uploadService.uploadAvatar(file, currentUser.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
