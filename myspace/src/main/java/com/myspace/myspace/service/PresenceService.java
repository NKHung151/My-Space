package com.myspace.myspace.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceService {

    // Map lưu trữ userId -> số lượng active sessions
    private final ConcurrentHashMap<Long, Integer> activeSessions = new ConcurrentHashMap<>();

    public boolean addOnlineUser(Long userId) {
        if (userId == null) return false;
        int count = activeSessions.merge(userId, 1, Integer::sum);
        if (count == 1) {
            log.info("User {} is now online", userId);
            return true; // Trạng thái thay đổi từ offline sang online
        }
        return false;
    }

    public boolean removeOnlineUser(Long userId) {
        if (userId == null) return false;
        Integer count = activeSessions.computeIfPresent(userId, (k, v) -> v > 1 ? v - 1 : null);
        if (count == null) {
            log.info("User {} is now offline", userId);
            return true; // Trạng thái thay đổi từ online sang offline
        }
        return false;
    }

    public Set<Long> getOnlineUsers() {
        return activeSessions.keySet();
    }
}
