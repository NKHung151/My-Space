package com.myspace.myspace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallActionRequest {
    private Long callId;       // Dùng cho accept, reject, end
    private Long receiverId;   // Dùng cho initiate (khi chưa có callId)
}
