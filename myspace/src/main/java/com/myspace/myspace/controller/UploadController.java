package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.dto.request.DeleteMediaRequest;
import com.myspace.myspace.dto.request.ImportExternalRequest;
import com.myspace.myspace.dto.response.UploadResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @PostMapping("/media")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UploadResponse> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UploadResponse response = uploadService.uploadMedia(file, currentUser.getUser().getId());
        return ApiResponse.success(response);
    }

    @PostMapping("/avatar")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UploadResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UploadResponse response = uploadService.uploadAvatar(file, currentUser.getUser().getId());
        return ApiResponse.success(response);
    }

    @PostMapping("/import-external")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UploadResponse> importExternalImage(
            @RequestBody ImportExternalRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UploadResponse response = uploadService.importExternalImage(request.getUrl(), currentUser.getUser().getId());
        return ApiResponse.success(response);
    }

    @DeleteMapping("/editor-media")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Map<String, String>> deleteEditorMedia(
            @RequestBody DeleteMediaRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        uploadService.deleteEditorMedia(request.getUrl(), currentUser.getUser().getId());
        return ApiResponse.success(Map.of("message", "Deleted successfully"));
    }
}
