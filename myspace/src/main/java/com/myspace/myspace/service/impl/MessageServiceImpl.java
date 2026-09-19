package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.MessageResponse;
import com.myspace.myspace.dto.response.MessageBroadcastResult;
import com.myspace.myspace.entity.Call;
import com.myspace.myspace.entity.Conversation;
import com.myspace.myspace.entity.Message;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.CallRepository;
import com.myspace.myspace.repository.ConversationRepository;
import com.myspace.myspace.repository.MessageRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CallRepository callRepository;

    @Override
    @Transactional
    public Conversation getOrCreateConversation(Long user1Id, Long user2Id) {
        Long smallerId = Math.min(user1Id, user2Id);
        Long largerId = Math.max(user1Id, user2Id);

        Optional<Conversation> conversationOpt = conversationRepository.findByUser1IdAndUser2Id(smallerId, largerId);
        if (conversationOpt.isPresent()) {
            return conversationOpt.get();
        }

        User user1 = userRepository.findById(smallerId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        User user2 = userRepository.findById(largerId).orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation conversation = new Conversation();
        conversation.setUser1(user1);
        conversation.setUser2(user2);
        return conversationRepository.save(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MessageResponse> getConversationMessages(Long conversationId, Pageable pageable) {
        Page<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
        return PageResponse.of(messages.map(this::mapToResponse));
    }

    @Override
    @Transactional
    public MessageBroadcastResult saveMessage(Long senderId, Long receiverId, String content) {
        Conversation conversation = getOrCreateConversation(senderId, receiverId);
        User sender = userRepository.getReferenceById(senderId);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message = messageRepository.save(message);
        
        String receiverEmail = conversation.getUser1().getId().equals(senderId) ? 
                conversation.getUser2().getEmail() : conversation.getUser1().getEmail();
                
        return new MessageBroadcastResult(mapToResponse(message), receiverEmail);
    }

    @Override
    @Transactional
    public MessageBroadcastResult editMessage(Long messageId, Long senderId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
                
        if (!message.getSender().getId().equals(senderId)) {
            throw new IllegalArgumentException("Not authorized to edit this message");
        }
        
        message.setContent(newContent);
        message.setUpdatedAt(LocalDateTime.now());
        message = messageRepository.save(message);
        
        Conversation conversation = message.getConversation();
        String receiverEmail = conversation.getUser1().getId().equals(senderId) ? 
                conversation.getUser2().getEmail() : conversation.getUser1().getEmail();
        
        return new MessageBroadcastResult(mapToResponse(message), receiverEmail);
    }

    @Override
    @Transactional
    public MessageBroadcastResult deleteMessage(Long messageId, Long senderId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
                
        if (!message.getSender().getId().equals(senderId)) {
            throw new IllegalArgumentException("Not authorized to delete this message");
        }
        
        message.setDeletedAt(LocalDateTime.now());
        message = messageRepository.save(message);
        
        Conversation conversation = message.getConversation();
        String receiverEmail = conversation.getUser1().getId().equals(senderId) ? 
                conversation.getUser2().getEmail() : conversation.getUser1().getEmail();
        
        return new MessageBroadcastResult(mapToResponse(message), receiverEmail);
    }



    @Override
    @Transactional
    public MessageBroadcastResult saveCallSystemMessage(Long callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new IllegalArgumentException("Call not found"));

        Message message = new Message();
        message.setConversation(call.getConversation());
        message.setSender(call.getCaller()); // Người gọi là sender
        message.setType(Message.MessageType.CALL);
        message.setCall(call);

        String prefix = Boolean.TRUE.equals(call.getIsVideo()) ? "VIDEO|" : "AUDIO|";
        String content = prefix + call.getStatus().name() + "|" + call.getEndReason().name();
        if (call.getDurationSeconds() != null) {
            content += "|" + call.getDurationSeconds();
        }
        message.setContent(content);

        message = messageRepository.save(message);

        String receiverEmail = call.getCaller().getId().equals(call.getConversation().getUser1().getId()) ?
                call.getConversation().getUser2().getEmail() : call.getConversation().getUser1().getEmail();

        return new MessageBroadcastResult(mapToResponse(message), receiverEmail);
    }

    private MessageResponse mapToResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                .content(message.getContent())
                .type(message.getType().name())
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .deletedAt(message.getDeletedAt())
                .isEdited(message.getUpdatedAt() != null)
                .isRead(message.getIsRead())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<Long, Long> getUnreadCounts(Long userId) {
        List<Object[]> results = messageRepository.countUnreadMessagesGroupedBySender(userId);
        java.util.Map<Long, Long> unreadCounts = new java.util.HashMap<>();
        for (Object[] result : results) {
            unreadCounts.put((Long) result[0], (Long) result[1]);
        }
        return unreadCounts;
    }

    @Override
    @Transactional
    public void markAsRead(Long senderId, Long receiverId) {
        messageRepository.markMessagesAsRead(receiverId, senderId);
    }
}
