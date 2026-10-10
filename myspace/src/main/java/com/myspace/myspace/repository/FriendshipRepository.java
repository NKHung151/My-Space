package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    boolean existsByUserIdAndFriendId(Long userId, Long friendId);

    long countByUserId(Long userId);

    @Query("SELECT f.friend.id FROM Friendship f WHERE f.user.id = :userId AND f.friend.id IN :ids")
    List<Long> findFriendIdsAmong(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    // Đếm số bạn của nhiều user trong 1 câu truy vấn (tránh N+1 khi hiển thị danh sách)
    @Query("SELECT f.user.id, COUNT(f) FROM Friendship f WHERE f.user.id IN :ids GROUP BY f.user.id")
    List<Object[]> countFriendsByUserIds(@Param("ids") List<Long> ids);

    @Query("SELECT f.friend FROM Friendship f WHERE f.user.id = :userId")
    List<com.myspace.myspace.entity.User> findFriendsByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Friendship f WHERE (f.user.id = :userId AND f.friend.id = :friendId) OR (f.user.id = :friendId AND f.friend.id = :userId)")
    void deleteByUserIdAndFriendIdBidirectional(@Param("userId") Long userId, @Param("friendId") Long friendId);
}
