package com.myspace.myspace.service;

import java.util.Map;

public interface ViewCountService {
    void incrementViewCount(Long postId, String viewerId);
    Long getRedisViewCount(Long postId);
    Map<Long, Long> getAllRedisViewCounts();
    void deleteViewCount(Long postId);
}
