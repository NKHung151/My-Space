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
    public List<UserDocument> searchUsers(String keyword) {
        try {
            SearchResponse<UserDocument> response = elasticsearchClient.search(s -> s
                    .index("users")
                    .query(q -> q
                            .multiMatch(m -> m
                                    .query(keyword)
                                    .fields("displayName", "username", "bio")
                                    .fuzziness("AUTO") // Tolerates typos
                            )
                    )
                    .size(20),
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
    public List<PostDocument> searchPosts(String keyword) {
        try {
            SearchResponse<PostDocument> response = elasticsearchClient.search(s -> s
                    .index("posts")
                    .query(q -> q
                            .multiMatch(m -> m
                                    .query(keyword)
                                    .fields("title^2", "tag", "excerpt") // Boost title matches
                                    .fuzziness("AUTO")
                            )
                    )
                    .size(20),
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
