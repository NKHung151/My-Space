package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.util.HtmlSanitizer;
import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.dto.response.TagResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.mapper.PostMapper;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.PublicPostService;
import com.myspace.myspace.service.ViewCountService;
import com.myspace.myspace.service.search.SearchQueryService;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicPostServiceImpl implements PublicPostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final SearchQueryService searchQueryService;
    private final ViewCountService viewCountService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getPublicPosts(String q, String tag, Boolean hasVideo, Long authorId, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (q != null && !q.isBlank()) {
            // Tìm kiếm qua Elasticsearch
            List<PostDocument> docs = searchQueryService.searchPosts(q.trim(), pageable.getPageNumber(), limit, tag, hasVideo);
            List<PostResponse> items = docs.stream().map(this::mapDocToResponse).collect(Collectors.toList());
            populateLikedStatus(items);
            populateRealtimeViewCounts(items);
            return new PageResponse<>(items, new PageResponse.Meta((long) items.size(), page, limit, 1));
        }

        // Lấy từ MySQL khi không có từ khóa tìm kiếm
        Page<Post> postsPage = postRepository.findPublicPosts(tag, hasVideo, authorId, pageable);
        List<PostResponse> items = postsPage.getContent().stream().map(PostMapper::toResponse).collect(Collectors.toList());
        populateLikedStatus(items);
        populateRealtimeViewCounts(items);
        return new PageResponse<>(items, new PageResponse.Meta(postsPage.getTotalElements(), page, limit, postsPage.getTotalPages()));
    }

    @Override
    @Transactional(readOnly = true)
    public PostDetailResponse getPublicPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        PostDetailResponse response = PostMapper.toDetailResponse(post);
        Long currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            response.setLiked(postLikeRepository.existsByPostIdAndUserId(id, currentUserId));
        } else {
            response.setLiked(false);
        }
        
        // Add real-time views from Redis
        Long redisViews = viewCountService.getRedisViewCount(id);
        response.setViewCount(response.getViewCount() + redisViews.intValue());
        
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TagResponse> getPopularTags(int limit) {
        return postRepository.getPopularTags(limit).stream()
                .map(row -> new TagResponse((String) row[0], ((Number) row[1]).longValue()))
                .collect(Collectors.toList());
    }

    @Override
    public void increaseViewCount(Long id, String viewerId) {
        // Only verify post exists, then increment in Redis
        postRepository.findById(id).orElseThrow(() -> new RuntimeException("Post not found"));
        viewCountService.incrementViewCount(id, viewerId);
    }

    /** Map PostDocument (Elasticsearch) → PostResponse. */
    private PostResponse mapDocToResponse(PostDocument doc) {
        PublicUserResponse author = PublicUserResponse.builder()
                .id(doc.getAuthorId())
                .displayName(doc.getAuthorDisplayName())
                .username(doc.getAuthorUsername())
                .avatarUrl(doc.getAuthorAvatarUrl())
                .build();

        return PostResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .slug(doc.getSlug())
                .excerpt(HtmlSanitizer.sanitize(doc.getExcerpt()))
                .coverImageUrl(HtmlSanitizer.safeUrl(doc.getCoverImageUrl()))
                .hasVideo(doc.getHasVideo())
                .tag(doc.getTag())
                .viewCount(doc.getViewCount())
                .likeCount(doc.getLikeCount())
                .commentCount(doc.getCommentCount())
                .author(author)
                .publishedAt(doc.getPublishedAt())
                .createdAt(doc.getCreatedAt())
                .build();
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUser().getId();
        }
        return null;
    }

    private void populateLikedStatus(List<PostResponse> items) {
        Long currentUserId = getCurrentUserId();
        if (currentUserId == null || items.isEmpty()) {
            items.forEach(item -> item.setLiked(false));
            return;
        }

        List<Long> postIds = items.stream().map(PostResponse::getId).collect(Collectors.toList());
        List<Long> likedPostIds = postLikeRepository.findLikedPostIds(currentUserId, postIds);
        items.forEach(item -> item.setLiked(likedPostIds.contains(item.getId())));
    }

    private void populateRealtimeViewCounts(List<PostResponse> items) {
        for (PostResponse item : items) {
            Long redisViews = viewCountService.getRedisViewCount(item.getId());
            if (redisViews > 0) {
                item.setViewCount(item.getViewCount() + redisViews.intValue());
            }
        }
    }
}
