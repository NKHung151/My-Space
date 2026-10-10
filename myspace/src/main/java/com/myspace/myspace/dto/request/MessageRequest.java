package com.myspace.myspace.dto.request;

import lombok.Data;

@Data
public class MessageRequest {
    private Long receiverId;
    private String content;
    // Mã duy nhất do client sinh cho mỗi tin (UUID). Gửi lại cùng mã (mạng chập chờn, gửi lại sau khi kết nối lại)
    // thì server không tạo tin thứ hai.
    private String clientMessageId;
}
