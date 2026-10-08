package com.myspace.myspace.repository.search;

import com.myspace.myspace.document.UserDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface UserSearchRepository extends ElasticsearchRepository<UserDocument, Long> {
}
