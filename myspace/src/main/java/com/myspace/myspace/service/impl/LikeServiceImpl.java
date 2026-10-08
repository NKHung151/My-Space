package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.dto.response.LikeToggleResponse;
import com.myspace.myspace.entity.Comment;
import com.myspace.myspace.entity.CommentLike;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.PostLike;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.CommentLikeRepository;
import com.myspace.myspace.repository.CommentRepository;
import com.myspace.myspace.repository.PostLikeRepository;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.LikeService;
import com.myspace.myspace.service.search.SearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LikeServiceImpl implements LikeService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final UserRepository userRepository;
    private final SearchIndexService searchIndexService;

    @Override
    @Transactional
    public LikeToggleResponse togglePostLike(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));

        boolean exists = postLikeRepository.existsByPostIdAndUserId(postId, userId);
        if (exists) {
            postLikeRepository.deleteByPostIdAndUserId(postId, userId);
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
        } else {
            User user = userRepository.findById(userId).orElseThrow();
            PostLike postLike = new PostLike();
            postLike.setPost(post);
            postLike.setUser(user);
            postLikeRepository.save(postLike);
            post.setLikeCount(post.getLikeCount() + 1);
        }

        postRepository.save(post);
        searchIndexService.indexPost(post);

        return new LikeToggleResponse(!exists, post.getLikeCount());
    }

    @Override
    @Transactional
    public LikeToggleResponse toggleCommentLike(Long userId, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận."));

        boolean exists = commentLikeRepository.existsByCommentIdAndUserId(commentId, userId);
        if (exists) {
            commentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
            comment.setLikeCount(Math.max(0, comment.getLikeCount() - 1));
        } else {
            User user = userRepository.findById(userId).orElseThrow();
            CommentLike commentLike = new CommentLike();
            commentLike.setComment(comment);
            commentLike.setUser(user);
            commentLikeRepository.save(commentLike);
            comment.setLikeCount(comment.getLikeCount() + 1);
        }

        commentRepository.save(comment);

        return new LikeToggleResponse(!exists, comment.getLikeCount());
    }
}
