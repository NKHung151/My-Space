package com.myspace.myspace.service.search.impl;

import com.myspace.myspace.mapper.UserMapper;
import com.myspace.myspace.mapper.PostMapper;
import com.myspace.myspace.common.util.AfterCommit;
import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.search.PostSearchRepository;
import com.myspace.myspace.repository.search.UserSearchRepository;
import com.myspace.myspace.service.search.SearchIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchIndexServiceImpl implements SearchIndexService {

    private final UserSearchRepository userSearchRepository;
    private final PostSearchRepository postSearchRepository;

    @Override
    public void indexUser(User user) {
        UserDocument doc = UserMapper.toDocument(user); // dựng ngay khi còn trong transaction (tránh lazy-loading sau commit)
        AfterCommit.run(() -> {
            try {
                userSearchRepository.save(doc);
            } catch (Exception e) {
                log.error("Failed to index user [id={}] to Elasticsearch: {}", doc.getId(), e.getMessage());
            }
        });
    }

    @Override
    public void indexUsers(List<User> users) {
        if (users.isEmpty()) return;
        try {
            userSearchRepository.saveAll(users.stream().map(UserMapper::toDocument).toList());
        } catch (Exception e) {
            log.error("Failed to bulk index {} users to Elasticsearch: {}", users.size(), e.getMessage());
        }
    }

    @Override
    public void indexPost(Post post) {
        PostDocument doc = PostMapper.toDocument(post);
        AfterCommit.run(() -> {
            try {
                postSearchRepository.save(doc);
            } catch (Exception e) {
                log.error("Failed to index post [id={}] to Elasticsearch: {}", doc.getId(), e.getMessage());
            }
        });
    }

    @Override
    public void indexPosts(List<Post> posts) {
        if (posts.isEmpty()) return;
        try {
            postSearchRepository.saveAll(posts.stream().map(PostMapper::toDocument).toList());
        } catch (Exception e) {
            log.error("Failed to bulk index {} posts to Elasticsearch: {}", posts.size(), e.getMessage());
        }
    }

    @Override
    public void removePost(Long postId) {
        AfterCommit.run(() -> {
            try {
                postSearchRepository.deleteById(postId);
            } catch (Exception e) {
                log.error("Failed to remove post [id={}] from Elasticsearch: {}", postId, e.getMessage());
            }
        });
    }


}
