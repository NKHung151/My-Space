package com.myspace.myspace.service;

import com.myspace.myspace.dto.response.LikeToggleResponse;

/** Like / bỏ like là idempotent: gọi lại nhiều lần không làm sai bộ đếm. */
public interface LikeService {
    LikeToggleResponse likePost(Long userId, Long postId);
    LikeToggleResponse unlikePost(Long userId, Long postId);
    LikeToggleResponse likeComment(Long userId, Long commentId);
    LikeToggleResponse unlikeComment(Long userId, Long commentId);
}
