package com.myspace.myspace.service.search.impl;

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
        UserDocument doc = toDocument(user); // dựng ngay khi còn trong transaction (tránh lazy-loading sau commit)
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
            userSearchRepository.saveAll(users.stream().map(this::toDocument).toList());
        } catch (Exception e) {
            log.error("Failed to bulk index {} users to Elasticsearch: {}", users.size(), e.getMessage());
        }
    }

    @Override
    public void indexPost(Post post) {
        PostDocument doc = toDocument(post);
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
            postSearchRepository.saveAll(posts.stream().map(this::toDocument).toList());
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

    private UserDocument toDocument(User user) {
        return UserDocument.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
    }

    private PostDocument toDocument(Post post) {
        User author = post.getAuthor();
        return PostDocument.builder()
                .id(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .tag(post.getTag())
                .slug(post.getSlug())
                .coverImageUrl(post.getCoverImageUrl())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .hasVideo(post.getHasVideo())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .authorId(author != null ? author.getId() : null)
                .authorUsername(author != null ? author.getUsername() : null)
                .authorDisplayName(author != null ? author.getDisplayName() : null)
                .authorAvatarUrl(author != null ? author.getAvatarUrl() : null)
                .build();
    }
}
