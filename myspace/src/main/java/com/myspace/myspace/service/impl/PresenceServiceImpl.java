package com.myspace.myspace.service.impl;

import com.myspace.myspace.service.PresenceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu trong bộ nhớ của 1 instance: chạy nhiều instance backend thì cần bản cài đặt dùng Redis.
 */
@Service
@Slf4j
public class PresenceServiceImpl implements PresenceService {

    // Map lưu trữ userId -> số lượng active sessions
    private final ConcurrentHashMap<Long, Integer> activeSessions = new ConcurrentHashMap<>();

    @Override
    public boolean addOnlineUser(Long userId) {
        if (userId == null) return false;
        int count = activeSessions.merge(userId, 1, Integer::sum);
        if (count == 1) {
            log.info("User {} is now online", userId);
            return true; // Trạng thái thay đổi từ offline sang online
        }
        return false;
    }

    @Override
    public boolean removeOnlineUser(Long userId) {
        // Không có phiên nào của user (vd. CONNECT bị từ chối) -> không phát sự kiện "offline" giả
        if (userId == null || !activeSessions.containsKey(userId)) return false;
        Integer count = activeSessions.computeIfPresent(userId, (k, v) -> v > 1 ? v - 1 : null);
        if (count == null) {
            log.info("User {} is now offline", userId);
            return true; // Trạng thái thay đổi từ online sang offline
        }
        return false;
    }

    @Override
    public Set<Long> getOnlineUsers() {
        // Trả bản sao, không đưa view sống của map ra ngoài
        return Set.copyOf(activeSessions.keySet());
    }
}
