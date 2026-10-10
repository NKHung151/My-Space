package com.myspace.myspace.service;

import java.util.Set;

/** Theo dõi user đang online (đếm số phiên WebSocket của mỗi user). */
public interface PresenceService {

    /** @return true nếu user vừa chuyển từ offline sang online (phiên đầu tiên) */
    boolean addOnlineUser(Long userId);

    /** @return true nếu user vừa chuyển từ online sang offline (đóng phiên cuối cùng) */
    boolean removeOnlineUser(Long userId);

    Set<Long> getOnlineUsers();
}
