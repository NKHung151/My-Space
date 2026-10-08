package com.myspace.myspace.repository;

import com.myspace.myspace.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    // INSERT IGNORE: like 2 lần (double-click, 2 tab) không tạo bản ghi trùng; trả 1 nếu thực sự thêm mới
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "INSERT IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (:postId, :userId, NOW(6))", nativeQuery = true)
    int insertIfAbsent(@Param("postId") Long postId, @Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.post.id = :postId AND pl.user.id = :userId")
    int deleteLike(@Param("postId") Long postId, @Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.post.id = :postId")
    void deleteAllOfPost(@Param("postId") Long postId);

    @Query("SELECT pl.post.id FROM PostLike pl WHERE pl.user.id = :userId AND pl.post.id IN :postIds")
    List<Long> findLikedPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);
}
