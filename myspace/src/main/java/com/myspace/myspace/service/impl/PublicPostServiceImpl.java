package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.util.HtmlSanitizer;
import com.myspace.myspace.common.util.SecurityUtils;
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
import com.myspace.myspace.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
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
            SearchQueryService.SearchPage<PostDocument> result =
                    searchQueryService.searchPosts(q.trim(), pageable.getPageNumber(), limit, tag, hasVideo);
            List<PostResponse> items = result.items().stream().map(this::mapDocToResponse).collect(Collectors.toList());
            populateCountsFromDatabase(items);
            populateLikedStatus(items);
            populateRealtimeViewCounts(items);
            // Tổng số lấy từ Elasticsearch (trước đây = số item của trang hiện tại, totalPages luôn = 1)
            return new PageResponse<>(items, new PageResponse.Meta(result.total(), page, limit, totalPages(result.total(), limit)));
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
        Long currentUserId = SecurityUtils.currentUserId();
        Post post = postRepository.findById(id)
                // Bản nháp chỉ tác giả xem được; người khác nhận 404 như bài không tồn tại
                .filter(p -> p.getPublishedAt() != null || p.getAuthor().getId().equals(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
        PostDetailResponse response = PostMapper.toDetailResponse(post);
        if (currentUserId != null) {
            response.setLiked(postLikeRepository.existsByPostIdAndUserId(id, currentUserId));
        } else {
            response.setLiked(false);
        }
        
        // Add real-time views from Redis
        response.setViewCount(response.getViewCount() + (int) viewCountService.getPendingViewCount(id));
        
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
        // Chỉ đếm lượt xem cho bài đã xuất bản, rồi cộng dồn ở Redis
        postRepository.findById(id)
                .filter(p -> p.getPublishedAt() != null)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
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


    private void populateLikedStatus(List<PostResponse> items) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null || items.isEmpty()) {
            items.forEach(item -> item.setLiked(false));
            return;
        }

        List<Long> postIds = items.stream().map(PostResponse::getId).collect(Collectors.toList());
        List<Long> likedPostIds = postLikeRepository.findLikedPostIds(currentUserId, postIds);
        items.forEach(item -> item.setLiked(likedPostIds.contains(item.getId())));
    }

    private static int totalPages(long total, int limit) {
        return limit <= 0 ? 1 : (int) Math.ceil((double) total / limit);
    }

    Elasticsearch chỉ dùng để tìm (match); số like/bình luận/lượt xem lấy từ MySQL vì ES không còn
    được index lại sau mỗi lượt like/bình luận. Bài đã xóa khỏi DB nhưng còn sót trong ES thì bị loại.
    
    private void populateCountsFromDatabase(List<PostResponse> items) {
        if (items.isEmpty()) return;
        java.util.Map<Long, Post> posts = postRepository.findAllById(items.stream().map(PostResponse::getId).toList())
                .stream().collect(Collectors.toMap(Post::getId, p -> p));
        // Bỏ bài đã xóa khỏi DB (còn sót trong ES) và bài chưa xuất bản
        items.removeIf(item -> !posts.containsKey(item.getId()) || posts.get(item.getId()).getPublishedAt() == null);
        items.forEach(item -> {
            Post post = posts.get(item.getId());
            item.setLikeCount(post.getLikeCount());
            item.setCommentCount(post.getCommentCount());
            item.setViewCount(post.getViewCount());
        });
    }

    private void populateRealtimeViewCounts(List<PostResponse> items) {
        java.util.Map<Long, Long> pending = viewCountService.getPendingViewCounts(items.stream().map(PostResponse::getId).toList());
        items.forEach(item -> item.setViewCount(item.getViewCount() + pending.getOrDefault(item.getId(), 0L).intValue()));
    }
}
