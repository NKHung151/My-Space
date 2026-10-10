package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.CallResponse;
import com.myspace.myspace.entity.Call;

public final class CallMapper {

    private CallMapper() {}

    /** @param actionType sự kiện gửi qua WebSocket: incoming, initiated, accepted, rejected, cancelled, ended */
    public static CallResponse toResponse(Call call, String actionType) {
        return CallResponse.builder()
                .id(call.getId())
                .callerId(call.getCaller().getId())
                .calleeId(call.getCallee().getId())
                .status(call.getStatus().name())
                .type(actionType)
                .isVideo(call.getIsVideo())
                .createdAt(call.getCreatedAt())
                .build();
    }
}
