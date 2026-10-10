package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.MessageResponse;
import com.myspace.myspace.entity.Message;

public final class MessageMapper {

    private MessageMapper() {}

    public static MessageResponse toResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                // Tin nhắn đã thu hồi không được trả nội dung gốc về client
                .content(message.getDeletedAt() != null ? null : message.getContent())
                .type(message.getType().name())
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .deletedAt(message.getDeletedAt())
                .isEdited(message.getUpdatedAt() != null)
                .isRead(message.getIsRead())
                .clientMessageId(message.getClientMessageId())
                .build();
    }
}
