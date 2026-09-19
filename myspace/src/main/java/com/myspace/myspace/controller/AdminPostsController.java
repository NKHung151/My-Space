package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.dto.response.AdminPostResponse;
import com.myspace.myspace.service.AdminPostsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPostsController {

    private final AdminPostsService adminPostsService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminPostResponse>>> getPosts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {
        PageResponse<AdminPostResponse> data = adminPostsService.getPosts(search, tag, page, limit);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminPostResponse>> getPostById(@PathVariable Long id) {
        AdminPostResponse data = adminPostsService.getPostById(id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deletePost(@PathVariable Long id) {
        adminPostsService.deletePost(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
