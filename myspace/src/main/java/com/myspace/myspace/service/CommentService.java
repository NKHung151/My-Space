package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreateCommentRequest;
import com.myspace.myspace.dto.request.UpdateCommentRequest;
import com.myspace.myspace.dto.response.CommentResponse;

import java.util.List;

public interface CommentService {
    PageResponse<CommentResponse> getCommentsByPost(Long postId, int page, int limit, Long currentUserId, String currentUserRole);
    List<CommentResponse> getReplies(Long commentId, Long currentUserId, String currentUserRole);
    CommentResponse createComment(Long postId, Long authorId, CreateCommentRequest request, String currentUserRole);
    CommentResponse updateComment(Long commentId, Long authorId, UpdateCommentRequest request, String currentUserRole);
    void deleteComment(Long commentId, Long userId, String userRole);
}
