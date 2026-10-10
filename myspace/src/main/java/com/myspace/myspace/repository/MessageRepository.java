package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    Optional<Message> findBySenderIdAndClientMessageId(Long senderId, String clientMessageId);

    Page<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    @Query("SELECT m.sender.id, COUNT(m) FROM Message m WHERE (m.conversation.user1.id = :userId OR m.conversation.user2.id = :userId) AND m.sender.id != :userId AND m.isRead = false GROUP BY m.sender.id")
    List<Object[]> countUnreadMessagesGroupedBySender(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE (m.conversation.user1.id = :userId OR m.conversation.user2.id = :userId) AND m.sender.id = :senderId AND m.isRead = false")
    void markMessagesAsRead(@Param("userId") Long userId, @Param("senderId") Long senderId);
}
