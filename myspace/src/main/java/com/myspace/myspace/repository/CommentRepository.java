package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
    
    // Đếm số lượng câu trả lời của một bình luận cha
    long countByParentId(Long parentId);
    
    // Đếm tổng số bình luận của một bài viết
    long countByPostId(Long postId);

    // Tìm các bình luận đang trả lời cho một bình luận cụ thể
    List<Comment> findByReplyToCommentId(Long replyToCommentId);
}
