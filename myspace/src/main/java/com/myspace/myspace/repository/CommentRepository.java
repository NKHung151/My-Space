package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    
    // Lấy danh sách bình luận gốc của bài viết (comment cha)
    Page<Comment> findByPostIdAndParentIsNullOrderByCreatedAtDesc(Long postId, Pageable pageable);

    // Lấy tất cả các câu trả lời của một bình luận cha cụ thể
    List<Comment> findByParentIdOrderByCreatedAtAsc(Long parentId);
    
    // TỐI ƯU: Lấy danh sách các câu trả lời cho NHIỀU bình luận cha cùng lúc để tránh lỗi N+1 Query
    List<Comment> findByParentIdInOrderByCreatedAtAsc(List<Long> parentIds);

    // Tìm comment theo ID và ID của tác giả (Dùng để xác thực quyền)
    Optional<Comment> findByIdAndAuthorId(Long id, Long authorId);
    
    // Đếm tổng số bình luận của một bài viết
    long countByPostId(Long postId);

    // Tìm các bình luận đang trả lời cho một bình luận cụ thể
    List<Comment> findByReplyToCommentId(Long replyToCommentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comment c WHERE c.id = :id")
    Optional<Comment> findByIdForUpdate(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = CASE WHEN COALESCE(c.likeCount, 0) + :delta < 0 THEN 0 ELSE COALESCE(c.likeCount, 0) + :delta END WHERE c.id = :id")
    void addLikeCount(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("UPDATE Comment c SET c.replyCount = CASE WHEN COALESCE(c.replyCount, 0) + :delta < 0 THEN 0 ELSE COALESCE(c.replyCount, 0) + :delta END WHERE c.id = :id")
    void addReplyCount(@Param("id") Long id, @Param("delta") int delta);

    @Query("SELECT COALESCE(c.likeCount, 0) FROM Comment c WHERE c.id = :id")
    int findLikeCount(@Param("id") Long id);

    // Gỡ tham chiếu parent/reply giữa các bình luận của bài trước khi xóa hàng loạt
    // (FK tự tham chiếu trên comments đang là NO ACTION, xóa thẳng sẽ bị MySQL chặn)
    @Modifying
    @Query("UPDATE Comment c SET c.parent = NULL, c.replyToComment = NULL WHERE c.post.id = :postId")
    void detachThreadOfPost(@Param("postId") Long postId);

    @Modifying
    @Query("DELETE FROM Comment c WHERE c.post.id = :postId")
    void deleteAllOfPost(@Param("postId") Long postId);
}
