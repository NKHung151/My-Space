package com.myspace.myspace.service.search;

import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.repository.search.PostSearchRepository;
import com.myspace.myspace.repository.search.UserSearchRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đồng bộ lại toàn bộ user và bài viết sang Elasticsearch khi khởi động.
 * Index ES chỉ là bản sao: nếu bị lệch (ES từng lỗi, DB vừa dựng lại, dữ liệu cũ chưa từng được index...)
 * thì khởi động lại app là đồng bộ lại. Tắt bằng app.search.reindex-on-startup=false.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.search.reindex-on-startup", havingValue = "true", matchIfMissing = true)
public class SearchReindexer implements ApplicationRunner {

    private static final int BATCH_SIZE = 500;

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final SearchIndexService searchIndexService;
    private final UserSearchRepository userSearchRepository;
    private final PostSearchRepository postSearchRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        try {
            // Xóa tài liệu cũ trước (user/bài đã bị xóa khỏi DB sẽ không còn xuất hiện trong kết quả tìm kiếm)
            userSearchRepository.deleteAll();
            postSearchRepository.deleteAll();
        } catch (Exception e) {
            log.error("Elasticsearch unavailable, skip reindex on startup: {}", e.getMessage());
            return;
        }

        long users = 0;
        Page<com.myspace.myspace.entity.User> userPage;
        int page = 0;
        do {
            userPage = userRepository.findAll(PageRequest.of(page++, BATCH_SIZE, Sort.by("id")));
            searchIndexService.indexUsers(userPage.getContent());
            users += userPage.getNumberOfElements();
            entityManager.clear(); // không giữ cả bảng trong bộ nhớ
        } while (userPage.hasNext());

        long posts = 0;
        Page<com.myspace.myspace.entity.Post> postPage;
        page = 0;
        do {
            postPage = postRepository.findAll(PageRequest.of(page++, BATCH_SIZE, Sort.by("id")));
            searchIndexService.indexPosts(postPage.getContent());
            posts += postPage.getNumberOfElements();
            entityManager.clear();
        } while (postPage.hasNext());

        log.info("Reindexed {} users and {} posts to Elasticsearch", users, posts);
    }
}
