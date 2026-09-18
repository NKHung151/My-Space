package com.myspace.myspace.service;

import com.myspace.myspace.dto.response.LikeToggleResponse;

public interface LikeService {
    LikeToggleResponse togglePostLike(Long userId, Long postId);
    LikeToggleResponse toggleCommentLike(Long userId, Long commentId);
}
