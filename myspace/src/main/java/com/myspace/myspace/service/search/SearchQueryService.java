package com.myspace.myspace.service.search;

import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.document.UserDocument;

import java.util.List;

/**
 * Responsible for executing full-text search queries against Elasticsearch.
 */
public interface SearchQueryService {

    /** 1 trang kết quả kèm tổng số kết quả khớp (để FE phân trang đúng). */
    record SearchPage<T>(List<T> items, long total) {
        public static <T> SearchPage<T> empty() {
            return new SearchPage<>(List.of(), 0);
        }
    }

    /** @param excludeUserId bỏ chính người đang tìm khỏi kết quả (null = không loại ai) */
    SearchPage<UserDocument> searchUsers(String keyword, int page, int size, Long excludeUserId);

    SearchPage<PostDocument> searchPosts(String keyword, int page, int size, String tag, Boolean hasVideo);
}
