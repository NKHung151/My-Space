package com.myspace.myspace.service;

import java.util.Collection;
import java.util.Map;

/**
 * Lượt xem được cộng dồn ở Redis rồi định kỳ đồng bộ xuống MySQL.
 * "pending" = số lượt xem đã ghi nhận ở Redis nhưng chưa đồng bộ.
 */
public interface ViewCountService {
    void incrementViewCount(Long postId, String viewerId);
    long getPendingViewCount(Long postId);
    /** Đọc pending của nhiều bài bằng 1 lệnh MGET (tránh N+1 lệnh Redis khi hiển thị 1 trang feed). */
    Map<Long, Long> getPendingViewCounts(Collection<Long> postIds);
}
