package com.myspace.myspace.service;

import java.util.Map;
import java.util.Optional;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.entity.Conversation;
import com.myspace.myspace.dto.response.MessageResponse;
import com.myspace.myspace.dto.response.MessageBroadcastResult;
import org.springframework.data.domain.Pageable;

public interface MessageService {
    Conversation getOrCreateConversation(Long user1Id, Long user2Id);
    PageResponse<MessageResponse> getConversationMessages(Long conversationId, Long currentUserId, Pageable pageable);
    MessageBroadcastResult saveMessage(Long senderId, Long receiverId, String content, String clientMessageId);
    Optional<MessageBroadcastResult> findSentMessage(Long senderId, String clientMessageId);
    MessageBroadcastResult editMessage(Long messageId, Long senderId, String newContent);
    MessageBroadcastResult deleteMessage(Long messageId, Long senderId);
    MessageBroadcastResult saveCallSystemMessage(Long callId);
    Map<Long, Long> getUnreadCounts(Long userId);
    void markAsRead(Long senderId, Long receiverId);
}
