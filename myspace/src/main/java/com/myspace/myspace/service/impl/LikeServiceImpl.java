package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.dto.response.LikeToggleResponse;
import com.myspace.myspace.repository.CommentLikeRepository;
import com.myspace.myspace.repository.CommentRepository;
import com.myspace.myspace.repository.PostLikeRepository;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LikeServiceImpl implements LikeService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Override
    @Transactional
    public LikeToggleResponse likePost(Long userId, Long postId) {
        requirePost(postId);
        // Chỉ tăng bộ đếm khi thực sự thêm được bản ghi like (lần like thứ 2 bị INSERT IGNORE bỏ qua)
        if (postLikeRepository.insertIfAbsent(postId, userId) > 0) {
            postRepository.addLikeCount(postId, 1);
        }
        return new LikeToggleResponse(true, postRepository.findLikeCount(postId));
    }

    @Override
    @Transactional
    public LikeToggleResponse unlikePost(Long userId, Long postId) {
        requirePost(postId);
        if (postLikeRepository.deleteLike(postId, userId) > 0) {
            postRepository.addLikeCount(postId, -1);
        }
        return new LikeToggleResponse(false, postRepository.findLikeCount(postId));
    }

    @Override
    @Transactional
    public LikeToggleResponse likeComment(Long userId, Long commentId) {
        requireComment(commentId);
        if (commentLikeRepository.insertIfAbsent(commentId, userId) > 0) {
            commentRepository.addLikeCount(commentId, 1);
        }
        return new LikeToggleResponse(true, commentRepository.findLikeCount(commentId));
    }

    @Override
    @Transactional
    public LikeToggleResponse unlikeComment(Long userId, Long commentId) {
        requireComment(commentId);
        if (commentLikeRepository.deleteLike(commentId, userId) > 0) {
            commentRepository.addLikeCount(commentId, -1);
        }
        return new LikeToggleResponse(false, commentRepository.findLikeCount(commentId));
    }

    // Khóa dòng bài/bình luận trước (tránh deadlock INSERT-qua-FK rồi UPDATE bộ đếm),
    // đồng thời kiểm tra tồn tại vì INSERT IGNORE nuốt cả lỗi khóa ngoại
    private void requirePost(Long postId) {
        postRepository.findByIdForUpdate(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
    }

    private void requireComment(Long commentId) {
        commentRepository.findByIdForUpdate(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận."));
    }
}
