package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.FriendRequestResponse;
import com.myspace.myspace.entity.FriendRequest;

public final class FriendMapper {

    private FriendMapper() {}

    public static FriendRequestResponse toRequestResponse(FriendRequest request) {
        return FriendRequestResponse.builder()
                .id(request.getId())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .sender(UserMapper.toPublicUser(request.getSender()))
                .build();
    }
}
