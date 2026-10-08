package com.myspace.myspace.repository;

import com.myspace.myspace.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);
    void deleteByCommentIdAndUserId(Long commentId, Long userId);
    @Modifying
    @Query("DELETE FROM CommentLike cl WHERE cl.comment.id = :commentId")
    void deleteByCommentId(@Param("commentId") Long commentId);

    @Modifying
    @Query("DELETE FROM CommentLike cl WHERE cl.comment.id IN :commentIds")
    void deleteByCommentIdIn(@Param("commentIds") List<Long> commentIds);

    @Modifying
    @Query("DELETE FROM CommentLike cl WHERE cl.comment.id IN (SELECT c.id FROM Comment c WHERE c.post.id = :postId)")
    void deleteAllOfPost(@Param("postId") Long postId);

    @Query("SELECT cl.comment.id FROM CommentLike cl WHERE cl.user.id = :userId AND cl.comment.id IN :commentIds")
    List<Long> findLikedCommentIds(@Param("userId") Long userId, @Param("commentIds") List<Long> commentIds);
}
