package com.myspace.myspace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageBroadcastResult {
    private MessageResponse message;
    private String receiverEmail;
    // true = tin đã tồn tại (client gửi lại cùng clientMessageId) -> chỉ trả lại cho người gửi, không báo lần nữa cho người nhận
    private boolean duplicate;

    public MessageBroadcastResult(MessageResponse message, String receiverEmail) {
        this(message, receiverEmail, false);
    }
}
