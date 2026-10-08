package com.myspace.myspace.service.search.impl;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.service.search.SearchQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchQueryServiceImpl implements SearchQueryService {

    private final ElasticsearchClient elasticsearchClient;

    @Override
    public SearchPage<UserDocument> searchUsers(String keyword, int page, int size, Long excludeUserId) {
        try {
            int from = Math.max(0, page * size);
            SearchResponse<UserDocument> response = elasticsearchClient.search(s -> s
                    .index("users")
                    .query(q -> q
                            .bool(b -> {
                                b.must(m -> m
                                        .multiMatch(mm -> mm
                                                .query(keyword)
                                                .fields("displayName", "username", "bio")
                                                .fuzziness("AUTO") // Tolerates typos
                                        )
                                );
                                // Loại ngay trong truy vấn để tổng số và phân trang đúng
                                if (excludeUserId != null) {
                                    b.mustNot(mn -> mn.ids(i -> i.values(String.valueOf(excludeUserId))));
                                }
                                return b;
                            })
                    )
                    .from(from)
                    .size(size),
                    UserDocument.class
            );
            return toPage(response);
        } catch (Exception e) {
            log.error("Elasticsearch user search failed for keyword [{}]: {}", keyword, e.getMessage());
            return SearchPage.empty();
        }
    }

    @Override
    public SearchPage<PostDocument> searchPosts(String keyword, int page, int size, String tag, Boolean hasVideo) {
        try {
            int from = Math.max(0, page * size);
            SearchResponse<PostDocument> response = elasticsearchClient.search(s -> s
                    .index("posts")
                    .query(q -> q
                            .bool(b -> {
                                b.must(m -> m
                                    .multiMatch(mm -> mm
                                            .query(keyword)
                                            .fields("title^2", "tag", "excerpt")
                                            .fuzziness("AUTO")
                                    )
                                );
                                if (tag != null && !tag.isEmpty()) {
                                    b.filter(f -> f.term(t -> t.field("tag.keyword").value(tag)));
                                }
                                if (hasVideo != null) {
                                    b.filter(f -> f.term(t -> t.field("hasVideo").value(hasVideo)));
                                }
                                return b;
                            })
                    )
                    .from(from)
                    .size(size)
                    .trackTotalHits(t -> t.enabled(true)),
                    PostDocument.class
            );
            return toPage(response);
        } catch (Exception e) {
            log.error("Elasticsearch post search failed for keyword [{}]: {}", keyword, e.getMessage());
            return SearchPage.empty();
        }
    }

    private static <T> SearchPage<T> toPage(SearchResponse<T> response) {
        var items = response.hits().hits().stream().map(Hit::source).filter(Objects::nonNull).toList();
        long total = response.hits().total() != null ? response.hits().total().value() : items.size();
        return new SearchPage<>(items, total);
    }
}
