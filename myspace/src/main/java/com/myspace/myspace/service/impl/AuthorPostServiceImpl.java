package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.util.HtmlSanitizer;
import com.myspace.myspace.common.util.TextUtils;
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
import com.myspace.myspace.service.UploadService;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.myspace.myspace.repository.MediaAssetRepository;

@Service
@RequiredArgsConstructor
public class AuthorPostServiceImpl implements AuthorPostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final SearchIndexService searchIndexService;
    private final UploadService uploadService;
    private final MediaAssetRepository mediaAssetRepository;
    private final PostChildrenCleaner postChildrenCleaner;

    @Override
    @Transactional
    public PostDetailResponse createPost(Long authorId, CreatePostRequest request) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        Post post = new Post();
        post.setTitle(request.getTitle());
        post.setUnaccentedTitle(TextUtils.unaccent(request.getTitle()));
        post.setExcerpt(HtmlSanitizer.sanitize(request.getExcerpt()));
        post.setContent(HtmlSanitizer.sanitize(request.getContent()));
        post.setCoverImageUrl(HtmlSanitizer.safeUrl(request.getCoverImageUrl()));
        post.setHasVideo(Boolean.TRUE.equals(request.getHasVideo()));
        post.setTag(request.getTag());
        post.setUnaccentedTag(TextUtils.unaccent(request.getTag()));
        post.setAuthor(author);
        if (request.isPublish()) {
            post.setPublishedAt(LocalDateTime.now());
        }
        Post saved = postRepository.save(post);
        updateMediaStatus(saved.getContent(), saved.getCoverImageUrl(), saved.getId(), authorId);
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
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
        PostDetailResponse response = PostMapper.toDetailResponse(post);
        response.setLiked(postLikeRepository.existsByPostIdAndUserId(postId, authorId));
        return response;
    }

    @Override
    @Transactional
    public PostDetailResponse updatePost(Long authorId, Long postId, UpdatePostRequest request) {
        Post post = postRepository.findByIdAndAuthorId(postId, authorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));

        if (request.getTitle() != null) {
            post.setTitle(request.getTitle());
            post.setUnaccentedTitle(TextUtils.unaccent(request.getTitle()));
        }
        if (request.getExcerpt() != null)      post.setExcerpt(HtmlSanitizer.sanitize(request.getExcerpt()));

        String newContent = HtmlSanitizer.sanitize(request.getContent());
        if (newContent != null && !newContent.equals(post.getContent())) {
            Set<String> oldUrls = extractCloudinaryUrls(post.getContent());
            Set<String> newUrls = extractCloudinaryUrls(newContent);
            for (String oldUrl : oldUrls) {
                if (!newUrls.contains(oldUrl)) {
                    uploadService.deleteEditorMedia(oldUrl, authorId);
                }
            }
            post.setContent(newContent);
        }

        String newCoverUrl = HtmlSanitizer.safeUrl(request.getCoverImageUrl());
        if (newCoverUrl != null && !newCoverUrl.equals(post.getCoverImageUrl())) {
            if (post.getCoverImageUrl() != null && post.getCoverImageUrl().contains("res.cloudinary.com")) {
                uploadService.deleteEditorMedia(post.getCoverImageUrl(), authorId);
            }
            post.setCoverImageUrl(newCoverUrl);
        }
        
        if (request.getHasVideo() != null)     post.setHasVideo(request.getHasVideo());
        if (request.getTag() != null) {
            post.setTag(request.getTag());
            post.setUnaccentedTag(TextUtils.unaccent(request.getTag()));
        }
        Post updated = postRepository.save(post);
        updateMediaStatus(updated.getContent(), updated.getCoverImageUrl(), updated.getId(), authorId);
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
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));

        // Xóa tất cả media Cloudinary liên quan
        Set<String> urls = extractCloudinaryUrls(post.getContent());
        if (post.getCoverImageUrl() != null && post.getCoverImageUrl().contains("res.cloudinary.com")) {
            urls.add(post.getCoverImageUrl());
        }
        urls.forEach(url -> uploadService.deleteEditorMedia(url, authorId));

        postChildrenCleaner.deleteChildrenOf(postId);
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

    private void updateMediaStatus(String content, String coverImageUrl, Long postId, Long authorId) {
        Set<String> urls = new HashSet<>();
        if (coverImageUrl != null && coverImageUrl.contains("res.cloudinary.com")) {
            urls.add(coverImageUrl);
        }
        if (content != null) {
            org.jsoup.nodes.Document doc = org.jsoup.Jsoup.parse(content);
            doc.select("img, video, audio").forEach(element -> {
                String src = element.attr("src");
                if (src.contains("res.cloudinary.com")) {
                    urls.add(src);
                }
            });
        }
        if (!urls.isEmpty()) {
            mediaAssetRepository.updateStatusAndPostIdByUrls("ATTACHED", postId, new java.util.ArrayList<>(urls), authorId);
        }
    }

    private Set<String> extractCloudinaryUrls(String content) {
        Set<String> urls = new HashSet<>();
        if (content != null) {
            Pattern pattern = Pattern.compile("https?://res\\.cloudinary\\.com/[^\"'\\s]+");
            Matcher matcher = pattern.matcher(content);
            while (matcher.find()) {
                urls.add(matcher.group());
            }
        }
        return urls;
    }
}
