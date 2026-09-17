package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    boolean existsByUserIdAndFriendId(Long userId, Long friendId);
    long countByUserId(Long userId);
}
