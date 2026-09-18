package com.myspace.myspace.controller;

import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.TagResponse;
import com.myspace.myspace.service.PublicPostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PublicPostController {

    private final PublicPostService publicPostService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> getPublicPosts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean hasVideo,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        PageResponse<PostResponse> posts = publicPostService.getPublicPosts(q, tag, hasVideo, page, limit);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getPublicPost(@PathVariable Long id) {
        PostDetailResponse post = publicPostService.getPublicPost(id);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    @GetMapping("/tags/popular")
    public ResponseEntity<ApiResponse<List<TagResponse>>> getPopularTags(
            @RequestParam(defaultValue = "10") int limit) {
        List<TagResponse> tags = publicPostService.getPopularTags(limit);
        return ResponseEntity.ok(ApiResponse.success(tags));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<ApiResponse<Void>> increaseViewCount(@PathVariable Long id) {
        publicPostService.increaseViewCount(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
