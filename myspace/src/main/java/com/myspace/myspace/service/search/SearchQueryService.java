package com.myspace.myspace.service.search;

import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.document.UserDocument;

import java.util.List;

/**
 * Responsible for executing full-text search queries against Elasticsearch.
 */
public interface SearchQueryService {

    List<UserDocument> searchUsers(String keyword, int page, int size);

    List<PostDocument> searchPosts(String keyword);
}
