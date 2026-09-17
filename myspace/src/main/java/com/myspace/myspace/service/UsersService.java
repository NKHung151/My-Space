package com.myspace.myspace.service;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;

public interface UsersService {
    PageResponse<PublicUserResponse> getRecommendedUsers(Long currentUserId, String query, int page, int limit);
    PublicUserResponse getProfile(Long currentUserId, Long targetUserId);
}
