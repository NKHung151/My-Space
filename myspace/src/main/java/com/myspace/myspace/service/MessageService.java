package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.entity.Conversation;
import com.myspace.myspace.dto.response.MessageResponse;
import org.springframework.data.domain.Pageable;

public interface MessageService {
    Conversation getOrCreateConversation(Long user1Id, Long user2Id);
    PageResponse<MessageResponse> getConversationMessages(Long conversationId, Pageable pageable);
    MessageResponse saveMessage(Long senderId, Long receiverId, String content);
}
