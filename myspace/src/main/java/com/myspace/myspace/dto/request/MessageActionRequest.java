package com.myspace.myspace.dto.request;

import lombok.Data;

@Data
public class MessageActionRequest {
    private Long messageId;
    private String content; // Optional for delete
}
