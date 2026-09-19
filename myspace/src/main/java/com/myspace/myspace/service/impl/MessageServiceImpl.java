package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.MessageResponse;
import com.myspace.myspace.entity.Conversation;
import com.myspace.myspace.entity.Message;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.ConversationRepository;
import com.myspace.myspace.repository.MessageRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

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
    public MessageResponse saveMessage(Long senderId, Long receiverId, String content) {
        Conversation conversation = getOrCreateConversation(senderId, receiverId);
        User sender = userRepository.getReferenceById(senderId);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message.setType(Message.MessageType.TEXT);
        message = messageRepository.save(message);
        return mapToResponse(message);
    }

    private MessageResponse mapToResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                .content(message.getContent())
                .type(message.getType().name())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
