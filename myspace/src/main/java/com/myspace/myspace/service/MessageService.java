package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.entity.Conversation;
import com.myspace.myspace.dto.response.MessageResponse;
import com.myspace.myspace.dto.response.MessageBroadcastResult;
import org.springframework.data.domain.Pageable;

public interface MessageService {
    Conversation getOrCreateConversation(Long user1Id, Long user2Id);
    PageResponse<MessageResponse> getConversationMessages(Long conversationId, Pageable pageable);
    MessageBroadcastResult saveMessage(Long senderId, Long receiverId, String content);
    MessageBroadcastResult editMessage(Long messageId, Long senderId, String newContent);
    MessageBroadcastResult deleteMessage(Long messageId, Long senderId);
}
