package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreatePostRequest;
import com.myspace.myspace.dto.request.UpdatePostRequest;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;

public interface AuthorPostService {
    PostDetailResponse createPost(Long authorId, CreatePostRequest request);
    PageResponse<PostResponse> getMyPosts(Long authorId, int page, int limit);
    PostDetailResponse getMyPost(Long authorId, Long postId);
    PostDetailResponse updatePost(Long authorId, Long postId, UpdatePostRequest request);
    void deletePost(Long authorId, Long postId);
}
