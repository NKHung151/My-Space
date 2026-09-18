package com.myspace.myspace.service.impl;

import com.myspace.myspace.service.ViewCountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.time.Duration;

import lombok.extern.slf4j.Slf4j;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.search.SearchIndexService;

@Service
@RequiredArgsConstructor
@Slf4j
public class ViewCountServiceImpl implements ViewCountService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final PostRepository postRepository;
    private final SearchIndexService searchIndexService;
    
    private static final String VIEW_KEY_PREFIX = "post:views:";
    private static final String TRACK_KEY_PREFIX = "view:track:post:";

    @Override
    public void incrementViewCount(Long postId, String viewerId) {
        String trackKey = TRACK_KEY_PREFIX + postId + ":viewer:" + viewerId;
        
        // Check if user/IP already viewed this post in the last 24h
        Boolean isNewView = redisTemplate.opsForValue().setIfAbsent(trackKey, "1", Duration.ofHours(24));
        
        if (Boolean.TRUE.equals(isNewView)) {
            String key = VIEW_KEY_PREFIX + postId;
            redisTemplate.opsForValue().increment(key);
        }
    }

    @Override
    public Long getRedisViewCount(Long postId) {
        String key = VIEW_KEY_PREFIX + postId;
        Object value = redisTemplate.opsForValue().get(key);
        if (value == null) return 0L;
        if (value instanceof Integer) {
            return ((Integer) value).longValue();
        }
        if (value instanceof String) {
            return Long.parseLong((String) value);
        }
        return (Long) value;
    }

    @Override
    public Map<Long, Long> getAllRedisViewCounts() {
        Set<String> keys = redisTemplate.keys(VIEW_KEY_PREFIX + "*");
        Map<Long, Long> viewCounts = new HashMap<>();
        
        if (keys == null || keys.isEmpty()) {
            return viewCounts;
        }

        for (String key : keys) {
            try {
                Long postId = Long.parseLong(key.substring(VIEW_KEY_PREFIX.length()));
                Object value = redisTemplate.opsForValue().get(key);
                Long count = 0L;
                if (value != null) {
                    if (value instanceof Integer) {
                        count = ((Integer) value).longValue();
                    } else if (value instanceof String) {
                        count = Long.parseLong((String) value);
                    } else if (value instanceof Long) {
                        count = (Long) value;
                    }
                }
                if (count > 0) {
                    viewCounts.put(postId, count);
                }
            } catch (NumberFormatException ignored) {
                // Ignore keys that don't end in a number
            }
        }
        return viewCounts;
    }

    @Override
    public void deleteViewCount(Long postId) {
        String key = VIEW_KEY_PREFIX + postId;
        redisTemplate.delete(key);
    }

    // Run every 5 minutes (300000 ms)
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000)
    @org.springframework.transaction.annotation.Transactional
    public void syncViewCountsToDatabase() {
        log.info("Starting view count sync from Redis to MySQL...");
        
        Map<Long, Long> redisViewCounts = getAllRedisViewCounts();
        
        if (redisViewCounts.isEmpty()) {
            return;
        }

        int updatedCount = 0;
        for (Map.Entry<Long, Long> entry : redisViewCounts.entrySet()) {
            Long postId = entry.getKey();
            Long viewsToAdd = entry.getValue();

            com.myspace.myspace.entity.Post post = postRepository.findById(postId).orElse(null);
            if (post != null) {
                // Update MySQL
                post.setViewCount(post.getViewCount() + viewsToAdd.intValue());
                postRepository.save(post);
                
                // Update Elasticsearch
                searchIndexService.indexPost(post);
                
                // Clear from Redis
                deleteViewCount(postId);
                updatedCount++;
            } else {
                // If post was deleted, still clean up redis
                deleteViewCount(postId);
            }
        }
        
        log.info("Successfully synced {} post(s) view counts to MySQL.", updatedCount);
    }
}
