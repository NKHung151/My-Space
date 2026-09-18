package com.myspace.myspace.task;

import com.myspace.myspace.entity.Post;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.ViewCountService;
import com.myspace.myspace.service.search.SearchIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ViewSyncTask {

    private final ViewCountService viewCountService;
    private final PostRepository postRepository;
    private final SearchIndexService searchIndexService;

    // Run every 5 minutes (300000 ms)
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void syncViewCountsToDatabase() {
        log.info("Starting view count sync from Redis to MySQL...");
        
        Map<Long, Long> redisViewCounts = viewCountService.getAllRedisViewCounts();
        
        if (redisViewCounts.isEmpty()) {
            log.info("No views to sync.");
            return;
        }

        int updatedCount = 0;
        for (Map.Entry<Long, Long> entry : redisViewCounts.entrySet()) {
            Long postId = entry.getKey();
            Long viewsToAdd = entry.getValue();

            Post post = postRepository.findById(postId).orElse(null);
            if (post != null) {
                // Update MySQL
                post.setViewCount(post.getViewCount() + viewsToAdd.intValue());
                postRepository.save(post);
                
                // Update Elasticsearch
                searchIndexService.indexPost(post);
                
                // Clear from Redis
                viewCountService.deleteViewCount(postId);
                updatedCount++;
            } else {
                // If post was deleted, still clean up redis
                viewCountService.deleteViewCount(postId);
            }
        }
        
        log.info("Successfully synced {} post(s) view counts to MySQL.", updatedCount);
    }
}
