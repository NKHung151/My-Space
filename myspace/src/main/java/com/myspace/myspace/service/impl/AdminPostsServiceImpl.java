package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.util.TextUtils;
import com.myspace.myspace.common.util.HtmlSanitizer;
import com.myspace.myspace.dto.response.AdminPostResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.AdminPostsService;
import com.myspace.myspace.service.UploadService;
import com.myspace.myspace.service.search.SearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminPostsServiceImpl implements AdminPostsService {

    private final PostRepository postRepository;
    private final UploadService uploadService;
    private final SearchIndexService searchIndexService;
    private final PostChildrenCleaner postChildrenCleaner;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminPostResponse> getPosts(String search, String tag, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        String searchParam = (search != null && !search.trim().isEmpty()) ? TextUtils.unaccent(search) : null;
        String tagParam = (tag != null && !tag.trim().isEmpty()) ? tag.trim() : null;
        
        Page<Post> postsPage = postRepository.searchAdminPosts(searchParam, tagParam, pageable);
        
        List<AdminPostResponse> content = postsPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
                
        return new PageResponse<>(content, new PageResponse.Meta(
                postsPage.getTotalElements(),
                page,
                limit,
                postsPage.getTotalPages()
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPostResponse getPostById(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
        return mapToResponse(post);
    }

    @Override
    @Transactional
    public void deletePost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
                
        Long authorId = post.getAuthor().getId();
        
        // Extract and delete Cloudinary media
        if (post.getCoverImageUrl() != null && post.getCoverImageUrl().contains("res.cloudinary.com")) {
            uploadService.deleteEditorMedia(post.getCoverImageUrl(), authorId);
        }
        
        if (post.getContent() != null) {
            Pattern pattern = Pattern.compile("https?://res\\.cloudinary\\.com/[^\"'\\s]+");
            Matcher matcher = pattern.matcher(post.getContent());
            while (matcher.find()) {
                String mediaUrl = matcher.group();
                uploadService.deleteEditorMedia(mediaUrl, authorId);
            }
        }
        
        postChildrenCleaner.deleteChildrenOf(id);
        postRepository.delete(post);
        searchIndexService.removePost(id);
    }
    
    private AdminPostResponse mapToResponse(Post post) {
        return AdminPostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(HtmlSanitizer.sanitize(post.getContent()))
                .tag(post.getTag())
                .createdAt(post.getCreatedAt())
                .author(AdminPostResponse.AdminPostAuthorResponse.builder()
                        .id(post.getAuthor().getId())
                        .displayName(post.getAuthor().getDisplayName())
                        .avatarUrl(post.getAuthor().getAvatarUrl())
                        .build())
                .build();
    }
}
