package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.AdminPostResponse;

public interface AdminPostsService {
    PageResponse<AdminPostResponse> getPosts(String search, String tag, int page, int limit);
    AdminPostResponse getPostById(Long id);
    void deletePost(Long id);
}
