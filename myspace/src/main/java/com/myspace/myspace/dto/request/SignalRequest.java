package com.myspace.myspace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalRequest {
    private Long callId;
    private Long targetId; // Người nhận tín hiệu (receiver of signal)
    private String type; // "offer", "answer", "candidate"
    private Object sdp; // Chứa mô tả SDP nếu là offer/answer
    private Object candidate; // Chứa ICE candidate
}
