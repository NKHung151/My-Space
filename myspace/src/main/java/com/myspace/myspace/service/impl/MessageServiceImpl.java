package com.myspace.myspace.service.impl;

import java.util.Map;
import java.util.HashMap;
import com.myspace.myspace.mapper.MessageMapper;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.exception.AppException;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.regex.Pattern;
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

        User user1 = userRepository.findById(smallerId).orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        User user2 = userRepository.findById(largerId).orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        Conversation conversation = new Conversation();
        conversation.setUser1(user1);
        conversation.setUser2(user2);
        return conversationRepository.save(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MessageResponse> getConversationMessages(Long conversationId, Long currentUserId, Pageable pageable) {
        // Chỉ 2 thành viên của cuộc hội thoại mới được đọc tin nhắn.
        // Trả 404 (không phải 403) để không lộ việc conversationId có tồn tại hay không.
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy cuộc hội thoại"));
        boolean isMember = conversation.getUser1().getId().equals(currentUserId)
                || conversation.getUser2().getId().equals(currentUserId);
        if (!isMember) {
            throw new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy cuộc hội thoại");
        }

        Page<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
        return PageResponse.of(messages.map(MessageMapper::toResponse));
    }

    @Override
    @Transactional
    public MessageBroadcastResult saveMessage(Long senderId, Long receiverId, String content, String clientMessageId) {
        if (receiverId == null || receiverId.equals(senderId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Người nhận không hợp lệ.");
        }
        content = validateContent(content);
        validateClientMessageId(clientMessageId);

        // Client gửi lại cùng mã (mất kết nối giữa chừng, gửi lại sau khi kết nối lại) -> trả lại tin đã lưu, không tạo tin thứ hai
        Optional<MessageBroadcastResult> existing = findSentMessage(senderId, clientMessageId);
        if (existing.isPresent()) {
            return existing.get();
        }

        Conversation conversation = getOrCreateConversation(senderId, receiverId);
        User sender = userRepository.getReferenceById(senderId);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message.setClientMessageId(clientMessageId);
        // Unique (sender_id, client_message_id) trong DB chặn trường hợp 2 lần gửi trùng đến cùng lúc
        message = messageRepository.saveAndFlush(message);

        return new MessageBroadcastResult(MessageMapper.toResponse(message), otherParticipantEmail(conversation, senderId));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MessageBroadcastResult> findSentMessage(Long senderId, String clientMessageId) {
        if (clientMessageId == null) return Optional.empty();
        return messageRepository.findBySenderIdAndClientMessageId(senderId, clientMessageId)
                .map(message -> new MessageBroadcastResult(
                        MessageMapper.toResponse(message),
                        otherParticipantEmail(message.getConversation(), senderId),
                        true));
    }

    private static String otherParticipantEmail(Conversation conversation, Long userId) {
        return conversation.getUser1().getId().equals(userId)
                ? conversation.getUser2().getEmail()
                : conversation.getUser1().getEmail();
    }

    @Override
    @Transactional
    public MessageBroadcastResult editMessage(Long messageId, Long senderId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy tin nhắn."));
                
        if (!message.getSender().getId().equals(senderId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa tin nhắn này.");
        }
        // Không sửa tin đã thu hồi (sẽ "hồi sinh" nội dung) hay tin hệ thống của cuộc gọi
        if (message.getDeletedAt() != null || message.getType() == Message.MessageType.CALL) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể sửa tin nhắn này.");
        }
        newContent = validateContent(newContent);
        
        message.setContent(newContent);
        message.setUpdatedAt(LocalDateTime.now());
        message = messageRepository.save(message);
        
        Conversation conversation = message.getConversation();
        String receiverEmail = conversation.getUser1().getId().equals(senderId) ? 
                conversation.getUser2().getEmail() : conversation.getUser1().getEmail();
        
        return new MessageBroadcastResult(MessageMapper.toResponse(message), receiverEmail);
    }

    @Override
    @Transactional
    public MessageBroadcastResult deleteMessage(Long messageId, Long senderId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy tin nhắn."));
                
        if (!message.getSender().getId().equals(senderId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền thu hồi tin nhắn này.");
        }
        if (message.getType() == Message.MessageType.CALL) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể thu hồi tin nhắn này.");
        }
        
        message.setDeletedAt(LocalDateTime.now());
        message = messageRepository.save(message);
        
        Conversation conversation = message.getConversation();
        String receiverEmail = conversation.getUser1().getId().equals(senderId) ? 
                conversation.getUser2().getEmail() : conversation.getUser1().getEmail();
        
        return new MessageBroadcastResult(MessageMapper.toResponse(message), receiverEmail);
    }

    @Override
    @Transactional
    public MessageBroadcastResult saveCallSystemMessage(Long callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy cuộc gọi."));

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

        return new MessageBroadcastResult(MessageMapper.toResponse(message), receiverEmail);
    }

    private static final int MAX_CONTENT_LENGTH = 5000;
    // Khớp cột client_message_id VARCHAR(64); chỉ nhận ký tự an toàn (UUID có dạng chữ-số-gạch ngang)
    private static final Pattern CLIENT_MESSAGE_ID = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");

    private static void validateClientMessageId(String clientMessageId) {
        if (clientMessageId != null && !CLIENT_MESSAGE_ID.matcher(clientMessageId).matches()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã tin nhắn không hợp lệ.");
        }
    }

    // Trước đây nhận cả nội dung rỗng/null và không giới hạn độ dài (cột TEXT ghi chú "tối đa 5000 ký tự" nhưng không kiểm tra)
    private static String validateContent(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tin nhắn không được để trống.");
        }
        if (trimmed.length() > MAX_CONTENT_LENGTH) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tin nhắn tối đa " + MAX_CONTENT_LENGTH + " ký tự");
        }
        return trimmed;
    }


    @Override
    @Transactional(readOnly = true)
    public Map<Long, Long> getUnreadCounts(Long userId) {
        List<Object[]> results = messageRepository.countUnreadMessagesGroupedBySender(userId);
        Map<Long, Long> unreadCounts = new HashMap<>();
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
