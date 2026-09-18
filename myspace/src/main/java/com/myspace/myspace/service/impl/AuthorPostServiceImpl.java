package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreatePostRequest;
import com.myspace.myspace.dto.request.UpdatePostRequest;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.mapper.PostMapper;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.AuthorPostService;
import com.myspace.myspace.service.search.SearchIndexService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthorPostServiceImpl implements AuthorPostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final SearchIndexService searchIndexService;

    @Override
    @Transactional
    public PostDetailResponse createPost(Long authorId, CreatePostRequest request) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("Author not found"));

        Post post = new Post();
        post.setTitle(request.getTitle());
        post.setExcerpt(request.getExcerpt());
        post.setContent(request.getContent());
        post.setCoverImageUrl(request.getCoverImageUrl());
        post.setHasVideo(Boolean.TRUE.equals(request.getHasVideo()));
        post.setTag(request.getTag());
        post.setAuthor(author);
        if (request.isPublish()) {
            post.setPublishedAt(LocalDateTime.now());
        }

        Post saved = postRepository.save(post);
        searchIndexService.indexPost(saved);
        PostDetailResponse response = PostMapper.toDetailResponse(saved);
        response.setLiked(false);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getMyPosts(Long authorId, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> posts = postRepository.findByAuthorId(authorId, pageable);

        List<PostResponse> items = posts.getContent().stream().map(PostMapper::toResponse).collect(Collectors.toList());
        populateLikedStatus(items);
        return new PageResponse<>(items, new PageResponse.Meta(posts.getTotalElements(), page, limit, posts.getTotalPages()));
    }

    @Override
    @Transactional(readOnly = true)
    public PostDetailResponse getMyPost(Long authorId, Long postId) {
        Post post = postRepository.findByIdAndAuthorId(postId, authorId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        PostDetailResponse response = PostMapper.toDetailResponse(post);
        Long currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            response.setLiked(postLikeRepository.existsByPostIdAndUserId(postId, currentUserId));
        } else {
            response.setLiked(false);
        }
        return response;
    }

    @Override
    @Transactional
    public PostDetailResponse updatePost(Long authorId, Long postId, UpdatePostRequest request) {
        Post post = postRepository.findByIdAndAuthorId(postId, authorId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (request.getTitle() != null)        post.setTitle(request.getTitle());
        if (request.getExcerpt() != null)      post.setExcerpt(request.getExcerpt());
        if (request.getContent() != null)      post.setContent(request.getContent());
        if (request.getCoverImageUrl() != null) post.setCoverImageUrl(request.getCoverImageUrl());
        if (request.getHasVideo() != null)     post.setHasVideo(request.getHasVideo());
        if (request.getTag() != null)          post.setTag(request.getTag());

        Post updated = postRepository.save(post);
        searchIndexService.indexPost(updated);
        PostDetailResponse response = PostMapper.toDetailResponse(updated);
        Long currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            response.setLiked(postLikeRepository.existsByPostIdAndUserId(postId, currentUserId));
        } else {
            response.setLiked(false);
        }
        return response;
    }

    @Override
    @Transactional
    public void deletePost(Long authorId, Long postId) {
        Post post = postRepository.findByIdAndAuthorId(postId, authorId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        postRepository.delete(post);
        searchIndexService.removePost(postId);
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
}
