package com.myspace.myspace.service;

import com.myspace.myspace.dto.response.FriendshipStatusResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.FriendRequestResponse;
import com.myspace.myspace.common.dto.PageResponse;

import java.util.List;

public interface FriendService {
    void sendRequest(Long currentUserId, Long targetUserId);
    void acceptRequest(Long currentUserId, Long senderId);
    void rejectRequest(Long currentUserId, Long senderId);
    void removeFriend(Long currentUserId, Long friendId);
    List<PublicUserResponse> getFriends(Long userId);
    List<FriendRequestResponse> getPendingRequests(Long currentUserId);
    FriendshipStatusResponse getFriendshipStatus(Long currentUserId, Long targetUserId);
    PageResponse<PostResponse> getFriendsFeed(Long currentUserId, int page, int limit);
}
