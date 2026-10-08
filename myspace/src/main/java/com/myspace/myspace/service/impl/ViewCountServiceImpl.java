package com.myspace.myspace.service.impl;

import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.ViewCountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ViewCountServiceImpl implements ViewCountService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final PostRepository postRepository;

    private static final String VIEW_KEY_PREFIX = "post:views:";
    private static final String TRACK_KEY_PREFIX = "view:track:post:";
    // Tập id các bài có lượt xem chưa đồng bộ — thay cho KEYS post:views:* (O(N), chặn Redis)
    private static final String DIRTY_SET_KEY = "post:views:dirty";

    @Override
    public void incrementViewCount(Long postId, String viewerId) {
        String trackKey = TRACK_KEY_PREFIX + postId + ":viewer:" + viewerId;

        // Mỗi user/IP chỉ tính 1 lượt xem / bài / 24h
        Boolean isNewView = redisTemplate.opsForValue().setIfAbsent(trackKey, "1", Duration.ofHours(24));

        if (Boolean.TRUE.equals(isNewView)) {
            redisTemplate.opsForValue().increment(VIEW_KEY_PREFIX + postId);
            redisTemplate.opsForSet().add(DIRTY_SET_KEY, postId.toString());
        }
    }

    @Override
    public long getPendingViewCount(Long postId) {
        return toLong(redisTemplate.opsForValue().get(VIEW_KEY_PREFIX + postId));
    }

    @Override
    public Map<Long, Long> getPendingViewCounts(Collection<Long> postIds) {
        Map<Long, Long> result = new HashMap<>();
        if (postIds.isEmpty()) return result;

        List<Long> ids = List.copyOf(postIds);
        List<Object> values = redisTemplate.opsForValue().multiGet(ids.stream().map(id -> VIEW_KEY_PREFIX + id).toList());
        for (int i = 0; i < ids.size(); i++) {
            long value = values == null ? 0 : toLong(values.get(i));
            if (value > 0) result.put(ids.get(i), value);
        }
        return result;
    }

    // Mặc định 5 phút; chỉnh bằng app.views.sync-interval-ms
    @Scheduled(fixedRateString = "${app.views.sync-interval-ms:300000}")
    public void syncViewCountsToDatabase() {
        Set<Object> dirty = redisTemplate.opsForSet().members(DIRTY_SET_KEY);
        if (dirty == null || dirty.isEmpty()) {
            return;
        }

        int updated = 0;
        for (Object member : dirty) {
            Long postId;
            try {
                postId = Long.valueOf(member.toString());
            } catch (NumberFormatException e) {
                redisTemplate.opsForSet().remove(DIRTY_SET_KEY, member);
                continue;
            }

            // Thứ tự quan trọng: bỏ khỏi tập dirty TRƯỚC rồi mới GETDEL. Lượt xem đến giữa 2 bước sẽ INCR (được GETDEL lấy luôn)
            // và SADD lại bài vào dirty -> lần sync sau chỉ thấy 0, không mất lượt nào.
            // (Trước đây: GET rồi mới DELETE -> lượt xem đến giữa 2 bước bị xóa mất.)
            redisTemplate.opsForSet().remove(DIRTY_SET_KEY, member);
            long views = toLong(redisTemplate.opsForValue().getAndDelete(VIEW_KEY_PREFIX + postId));
            if (views <= 0) continue;

            try {
                // UPDATE nguyên tử, mỗi bài 1 câu lệnh ngắn (bài đã xóa thì không có dòng nào bị ảnh hưởng)
                postRepository.addViewCount(postId, (int) views);
                updated++;
            } catch (Exception e) {
                // Ghi DB lỗi: trả lại lượt xem vào Redis để lần sau đồng bộ tiếp
                log.error("Failed to sync {} views of post {}: {}", views, postId, e.getMessage());
                redisTemplate.opsForValue().increment(VIEW_KEY_PREFIX + postId, views);
                redisTemplate.opsForSet().add(DIRTY_SET_KEY, postId.toString());
            }
        }

        if (updated > 0) log.info("Synced view counts of {} post(s) to MySQL.", updated);
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number number) return number.longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
