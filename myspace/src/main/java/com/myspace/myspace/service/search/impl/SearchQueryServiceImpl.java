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

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchQueryServiceImpl implements SearchQueryService {

    private final ElasticsearchClient elasticsearchClient;

    @Override
    public List<UserDocument> searchUsers(String keyword, int page, int size) {
        try {
            int from = Math.max(0, page * size);
            SearchResponse<UserDocument> response = elasticsearchClient.search(s -> s
                    .index("users")
                    .query(q -> q
                            .multiMatch(m -> m
                                    .query(keyword)
                                    .fields("displayName", "username", "bio")
                                    .fuzziness("AUTO") // Tolerates typos
                            )
                    )
                    .from(from)
                    .size(size),
                    UserDocument.class
            );
            return response.hits().hits().stream()
                    .map(Hit::source)
                    .toList();
        } catch (IOException e) {
            log.error("Elasticsearch user search failed for keyword [{}]: {}", keyword, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<PostDocument> searchPosts(String keyword, int page, int size, String tag, Boolean hasVideo) {
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
                    .size(size),
                    PostDocument.class
            );
            return response.hits().hits().stream()
                    .map(Hit::source)
                    .toList();
        } catch (IOException e) {
            log.error("Elasticsearch post search failed for keyword [{}]: {}", keyword, e.getMessage());
            return Collections.emptyList();
        }
    }
}
