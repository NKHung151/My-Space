package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.TagResponse;

import java.util.List;

public interface PublicPostService {
    PageResponse<PostResponse> getPublicPosts(String q, String tag, Boolean hasVideo, Long authorId, int page, int limit);
    PostDetailResponse getPublicPost(Long id);
    List<TagResponse> getPopularTags(int limit);
    void increaseViewCount(Long id);
}
