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
}
