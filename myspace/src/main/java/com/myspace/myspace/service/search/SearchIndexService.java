package com.myspace.myspace.service.search;

import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;

/**
 * Responsible for keeping Elasticsearch indexes in sync with MySQL data.
 * Called after any write operation (create, update, delete) on User or Post.
 */
public interface SearchIndexService {

    void indexUser(User user);

    void removeUser(Long userId);

    void indexPost(Post post);

    void removePost(Long postId);
}
