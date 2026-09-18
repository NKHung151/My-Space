package com.myspace.myspace.service.search.impl;

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

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchIndexServiceImpl implements SearchIndexService {

    private final UserSearchRepository userSearchRepository;
    private final PostSearchRepository postSearchRepository;

    @Override
    public void indexUser(User user) {
        UserDocument doc = UserDocument.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
        userSearchRepository.save(doc);
        log.debug("Indexed user [id={}] to Elasticsearch", user.getId());
    }

    @Override
    public void removeUser(Long userId) {
        userSearchRepository.deleteById(userId);
        log.debug("Removed user [id={}] from Elasticsearch index", userId);
    }

    @Override
    public void indexPost(Post post) {
        User author = post.getAuthor();
        PostDocument doc = PostDocument.builder()
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
        postSearchRepository.save(doc);
        log.debug("Indexed post [id={}] to Elasticsearch", post.getId());
    }

    @Override
    public void removePost(Long postId) {
        postSearchRepository.deleteById(postId);
        log.debug("Removed post [id={}] from Elasticsearch index", postId);
    }
}
