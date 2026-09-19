package com.myspace.myspace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CallResponse {
    private Long id;
    private Long callerId;
    private Long calleeId;
    private String status; // RINGING, ACCEPTED, ENDED...
    private String type; // Action type like "incoming", "accepted", "rejected", "ended", "missed"
    private Boolean isVideo;
    private LocalDateTime createdAt;
}
