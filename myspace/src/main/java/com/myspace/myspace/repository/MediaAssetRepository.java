package com.myspace.myspace.repository;

import com.myspace.myspace.entity.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {
    List<MediaAsset> findByStatusAndCreatedAtBefore(String status, LocalDateTime cutoff);

    Optional<MediaAsset> findFirstByUrl(String url);

    // Chỉ gắn media của chính tác giả vào bài, không cho "nhận" media của người khác
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE MediaAsset m SET m.status = :status, m.postId = :postId WHERE m.url IN :urls AND m.owner.id = :ownerId")
    void updateStatusAndPostIdByUrls(@Param("status") String status, @Param("postId") Long postId,
                                     @Param("urls") List<String> urls, @Param("ownerId") Long ownerId);
}
