package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorId(Long authorId, Pageable pageable);
    Optional<Post> findByIdAndAuthorId(Long id, Long authorId);

    @Query("SELECT p FROM Post p WHERE (:tag IS NULL OR p.tag = :tag) AND (:hasVideo IS NULL OR p.hasVideo = :hasVideo)")
    Page<Post> findPublicPosts(@Param("tag") String tag, @Param("hasVideo") Boolean hasVideo, Pageable pageable);

    @Query(value = "SELECT tag as tag, count(*) as count FROM posts WHERE tag IS NOT NULL GROUP BY tag ORDER BY count DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> getPopularTags(@Param("limit") int limit);
}
