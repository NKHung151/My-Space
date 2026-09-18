package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Friendship;
import com.myspace.myspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    boolean existsByUserIdAndFriendId(Long userId, Long friendId);
    long countByUserId(Long userId);

    @Query("SELECT f.friend FROM Friendship f WHERE f.user.id = :userId")
    List<com.myspace.myspace.entity.User> findFriendsByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Friendship f WHERE (f.user.id = :userId AND f.friend.id = :friendId) OR (f.user.id = :friendId AND f.friend.id = :userId)")
    void deleteByUserIdAndFriendIdBidirectional(@Param("userId") Long userId, @Param("friendId") Long friendId);
}
