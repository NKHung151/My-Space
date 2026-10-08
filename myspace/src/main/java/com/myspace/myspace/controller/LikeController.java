package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.dto.response.LikeToggleResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    // POST = like, DELETE = bỏ like (trước đây cả 2 đều "toggle" nên double-click hoặc 2 tab làm trạng thái đảo ngược)
    @PostMapping("/{postId}/like")
    public ResponseEntity<ApiResponse<LikeToggleResponse>> likePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(likeService.likePost(userDetails.getUser().getId(), postId)));
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<ApiResponse<LikeToggleResponse>> unlikePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(likeService.unlikePost(userDetails.getUser().getId(), postId)));
    }

    @PostMapping("/{postId}/comments/{commentId}/like")
    public ResponseEntity<ApiResponse<LikeToggleResponse>> likeComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(likeService.likeComment(userDetails.getUser().getId(), commentId)));
    }

    @DeleteMapping("/{postId}/comments/{commentId}/like")
    public ResponseEntity<ApiResponse<LikeToggleResponse>> unlikeComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(likeService.unlikeComment(userDetails.getUser().getId(), commentId)));
    }
}
