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

    @RequestMapping(value = "/{postId}/like", method = {RequestMethod.POST, RequestMethod.DELETE})
    public ResponseEntity<ApiResponse<LikeToggleResponse>> togglePostLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        LikeToggleResponse response = likeService.togglePostLike(userDetails.getUser().getId(), postId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @RequestMapping(value = "/{postId}/comments/{commentId}/like", method = {RequestMethod.POST, RequestMethod.DELETE})
    public ResponseEntity<ApiResponse<LikeToggleResponse>> toggleCommentLike(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        LikeToggleResponse response = likeService.toggleCommentLike(userDetails.getUser().getId(), commentId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
