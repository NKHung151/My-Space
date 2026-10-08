package com.myspace.myspace.repository.search;

import com.myspace.myspace.document.PostDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface PostSearchRepository extends ElasticsearchRepository<PostDocument, Long> {
}
