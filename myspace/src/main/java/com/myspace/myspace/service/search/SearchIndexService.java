package com.myspace.myspace.service.search;

import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;

public interface SearchIndexService {

    void indexUser(User user);

    void removeUser(Long userId);

    void indexPost(Post post);

    void removePost(Long postId);
}
