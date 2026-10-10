package com.myspace.myspace.service.search.impl;

import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.service.search.SearchQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

// Truy vấn qua ElasticsearchOperations của Spring Data (cùng bộ chuyển đổi đã dùng khi ghi document).
// Trước đây dùng thẳng ElasticsearchClient: client không giải mã được LocalDateTime của PostDocument
// ("Failed to decode response") nên tìm kiếm bài viết luôn rỗng.
 
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchQueryServiceImpl implements SearchQueryService {

    private final ElasticsearchOperations elasticsearchOperations;

    @Override
    public SearchPage<UserDocument> searchUsers(String keyword, int page, int size, Long excludeUserId) {
        try {
            NativeQuery query = NativeQuery.builder()
                    .withQuery(q -> q.bool(b -> {
                        b.must(m -> m.multiMatch(mm -> mm
                                .query(keyword)
                                .fields("displayName", "username", "bio")
                                .fuzziness("AUTO"))); // Tolerates typos
                        // Loại ngay trong truy vấn để tổng số và phân trang đúng
                        if (excludeUserId != null) {
                            b.mustNot(mn -> mn.ids(i -> i.values(String.valueOf(excludeUserId))));
                        }
                        return b;
                    }))
                    .withPageable(PageRequest.of(Math.max(page, 0), size))
                    .withTrackTotalHits(true)
                    .build();
            return toPage(elasticsearchOperations.search(query, UserDocument.class));
        } catch (Exception e) {
            log.error("Elasticsearch user search failed for keyword [{}]: {}", keyword, e.getMessage());
            return SearchPage.empty();
        }
    }

    @Override
    public SearchPage<PostDocument> searchPosts(String keyword, int page, int size, String tag, Boolean hasVideo) {
        try {
            NativeQuery query = NativeQuery.builder()
                    .withQuery(q -> q.bool(b -> {
                        b.must(m -> m.multiMatch(mm -> mm
                                .query(keyword)
                                .fields("title^2", "tag", "excerpt")
                                .fuzziness("AUTO")));
                        if (tag != null && !tag.isEmpty()) {
                            // Field "tag" là text, không có sub-field "tag.keyword" (bộ lọc cũ không bao giờ khớp)
                            b.filter(f -> f.matchPhrase(mp -> mp.field("tag").query(tag)));
                        }
                        if (hasVideo != null) {
                            b.filter(f -> f.term(t -> t.field("hasVideo").value(hasVideo)));
                        }
                        return b;
                    }))
                    .withPageable(PageRequest.of(Math.max(page, 0), size))
                    .withTrackTotalHits(true)
                    .build();
            return toPage(elasticsearchOperations.search(query, PostDocument.class));
        } catch (Exception e) {
            log.error("Elasticsearch post search failed for keyword [{}]: {}", keyword, e.getMessage());
            return SearchPage.empty();
        }
    }

    private static <T> SearchPage<T> toPage(SearchHits<T> hits) {
        return new SearchPage<>(hits.getSearchHits().stream().map(SearchHit::getContent).toList(), hits.getTotalHits());
    }
}
