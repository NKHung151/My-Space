package com.myspace.myspace.repository;

import com.myspace.myspace.entity.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {
    List<MediaAsset> findByStatusAndCreatedAtBefore(String status, LocalDateTime cutoff);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE MediaAsset m SET m.status = :status, m.postId = :postId WHERE m.url IN :urls")
    void updateStatusAndPostIdByUrls(@Param("status") String status, @Param("postId") Long postId, @Param("urls") List<String> urls);
}
