package com.myspace.myspace.service.impl;

import com.myspace.myspace.service.ViewCountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class ViewCountServiceImpl implements ViewCountService {

    private final RedisTemplate<String, Object> redisTemplate;
    
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
}
