package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreateCommentRequest;
import com.myspace.myspace.dto.request.UpdateCommentRequest;
import com.myspace.myspace.dto.response.CommentResponse;

import java.util.List;

public interface CommentService {
    PageResponse<CommentResponse> getCommentsByPost(Long postId, int page, int limit, Long currentUserId);
    CommentResponse createComment(Long postId, Long authorId, CreateCommentRequest request);
    CommentResponse updateComment(Long commentId, Long authorId, UpdateCommentRequest request);
    void deleteComment(Long commentId, Long userId);
}
