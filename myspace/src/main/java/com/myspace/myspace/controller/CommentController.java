package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreateCommentRequest;
import com.myspace.myspace.dto.request.UpdateCommentRequest;
import com.myspace.myspace.dto.response.CommentResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> getCommentsByPost(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long userId = userDetails != null ? userDetails.getUser().getId() : null;

        PageResponse<CommentResponse> comments = commentService.getCommentsByPost(postId, page, limit, userId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        // Đảm bảo user đã đăng nhập
        if (userDetails == null) {
            throw new RuntimeException("Unauthorized");
        }

        Long userId = userDetails.getUser().getId();

        CommentResponse comment = commentService.createComment(postId, userId, request);
        return ResponseEntity.ok(ApiResponse.success(comment));
    }

    @PatchMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            throw new RuntimeException("Unauthorized");
        }

        Long userId = userDetails.getUser().getId();

        CommentResponse comment = commentService.updateComment(commentId, userId, request);
        return ResponseEntity.ok(ApiResponse.success(comment));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            throw new RuntimeException("Unauthorized");
        }

        Long userId = userDetails.getUser().getId();

        commentService.deleteComment(commentId, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
