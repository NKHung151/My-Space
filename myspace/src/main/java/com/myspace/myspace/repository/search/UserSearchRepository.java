package com.myspace.myspace.repository.search;

import com.myspace.myspace.document.UserDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface UserSearchRepository extends ElasticsearchRepository<UserDocument, Long> {

    List<UserDocument> findByDisplayNameContainingOrUsernameContaining(String displayName, String username);
}
