package com.myspace.myspace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendshipStatusResponse {
    private String status; // NONE, FRIENDS, PENDING_SENT, PENDING_RECEIVED
}
