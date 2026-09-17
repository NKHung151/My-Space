package com.myspace.myspace.repository.search;

import com.myspace.myspace.document.PostDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface PostSearchRepository extends ElasticsearchRepository<PostDocument, Long> {

    List<PostDocument> findByTitleContainingOrExcerptContainingOrTagContaining(
            String title, String excerpt, String tag);
}
