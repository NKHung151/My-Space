package com.myspace.myspace.service.impl;

import com.myspace.myspace.repository.CommentLikeRepository;
import com.myspace.myspace.repository.CommentRepository;
import com.myspace.myspace.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Xóa dữ liệu con của một bài viết (like bình luận, bình luận, like bài) trước khi xóa bài.
 * Các FK trỏ về posts/comments trong DB là NO ACTION nên phải xóa đúng thứ tự, nếu không MySQL chặn DELETE posts.
 */
@Component
@RequiredArgsConstructor
class PostChildrenCleaner {

    private final CommentLikeRepository commentLikeRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;

    @Transactional(propagation = Propagation.MANDATORY)
    void deleteChildrenOf(Long postId) {
        commentLikeRepository.deleteAllOfPost(postId);
        commentRepository.detachThreadOfPost(postId);
        commentRepository.deleteAllOfPost(postId);
        postLikeRepository.deleteAllOfPost(postId);
    }
}
