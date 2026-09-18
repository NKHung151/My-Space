package com.myspace.myspace.repository;

import com.myspace.myspace.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    Optional<FriendRequest> findBySenderIdAndReceiverIdAndStatus(Long senderId, Long receiverId, String status);
    boolean existsBySenderIdAndReceiverIdAndStatus(Long senderId, Long receiverId, String status);

    List<FriendRequest> findByReceiverIdAndStatus(Long receiverId, String status);

    @Modifying
    @Query("DELETE FROM FriendRequest fr WHERE (fr.sender.id = :userId AND fr.receiver.id = :friendId) OR (fr.sender.id = :friendId AND fr.receiver.id = :userId)")
    void deleteBySenderIdAndReceiverIdBidirectional(@Param("userId") Long userId, @Param("friendId") Long friendId);
}
