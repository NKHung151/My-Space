package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Post;
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

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorId(Long authorId, Pageable pageable);
    Optional<Post> findByIdAndAuthorId(Long id, Long authorId);

    // Chỉ bài đã xuất bản (bản nháp chỉ tác giả xem qua /api/author/posts)
    @Query("SELECT p FROM Post p WHERE p.publishedAt IS NOT NULL AND (:tag IS NULL OR p.tag = :tag) AND (:hasVideo IS NULL OR p.hasVideo = :hasVideo) AND (:authorId IS NULL OR p.author.id = :authorId)")
    Page<Post> findPublicPosts(@Param("tag") String tag, @Param("hasVideo") Boolean hasVideo, @Param("authorId") Long authorId, Pageable pageable);

    @Query(value = "SELECT tag as tag, count(*) as count FROM posts WHERE tag IS NOT NULL AND published_at IS NOT NULL GROUP BY tag ORDER BY count DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> getPopularTags(@Param("limit") int limit);

    @Query("SELECT p FROM Post p INNER JOIN Friendship f ON p.author.id = f.friend.id WHERE f.user.id = :userId AND p.publishedAt IS NOT NULL")
    Page<Post> findPostsByFriendship(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE " +
           "(:tag IS NULL OR p.tag = :tag) AND " +
           "(:search IS NULL OR p.unaccentedTitle LIKE %:search% OR p.title LIKE %:search% OR p.author.unaccentedDisplayName LIKE %:search%)")
    Page<Post> searchAdminPosts(@Param("search") String search, @Param("tag") String tag, Pageable pageable);

    // SELECT ... FOR UPDATE: khóa dòng bài viết TRƯỚC khi thêm like/bình luận. Nếu không, INSERT (giữ khóa S qua FK)
    // rồi UPDATE posts (cần khóa X) ở 2 transaction đồng thời sẽ deadlock.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Post p WHERE p.id = :id")
    Optional<Post> findByIdForUpdate(@Param("id") Long id);

    // Cộng/trừ bộ đếm ngay trong SQL (nguyên tử), không đọc-sửa-ghi trên entity -> không mất lượt khi nhiều request đồng thời
    @Modifying
    @Query("UPDATE Post p SET p.likeCount = CASE WHEN COALESCE(p.likeCount, 0) + :delta < 0 THEN 0 ELSE COALESCE(p.likeCount, 0) + :delta END WHERE p.id = :id")
    void addLikeCount(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = CASE WHEN COALESCE(p.commentCount, 0) + :delta < 0 THEN 0 ELSE COALESCE(p.commentCount, 0) + :delta END WHERE p.id = :id")
    void addCommentCount(@Param("id") Long id, @Param("delta") int delta);

    @org.springframework.transaction.annotation.Transactional
    @Modifying
    @Query("UPDATE Post p SET p.viewCount = COALESCE(p.viewCount, 0) + :delta WHERE p.id = :id")
    void addViewCount(@Param("id") Long id, @Param("delta") int delta);

    @Query("SELECT COALESCE(p.likeCount, 0) FROM Post p WHERE p.id = :id")
    int findLikeCount(@Param("id") Long id);

    @Query("SELECT SUM(p.viewCount) FROM Post p")
    Long sumTotalViews();

    @Query("SELECT p FROM Post p ORDER BY p.viewCount DESC")
    List<Post> findTopArticles(Pageable pageable);
}
