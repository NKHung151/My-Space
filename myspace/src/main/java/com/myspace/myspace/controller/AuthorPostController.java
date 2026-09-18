package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreatePostRequest;
import com.myspace.myspace.dto.request.UpdatePostRequest;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.AuthorPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/author/posts")
@RequiredArgsConstructor
public class AuthorPostController {

    private final AuthorPostService authorPostService;

    @PostMapping
    public ResponseEntity<ApiResponse<PostDetailResponse>> createPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreatePostRequest request) {
        PostDetailResponse post = authorPostService.createPost(userDetails.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> getMyPosts(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        PageResponse<PostResponse> posts = authorPostService.getMyPosts(userDetails.getUser().getId(), page, limit);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getMyPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        PostDetailResponse post = authorPostService.getMyPost(userDetails.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> updatePost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePostRequest request) {
        PostDetailResponse post = authorPostService.updatePost(userDetails.getUser().getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        authorPostService.deletePost(userDetails.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
