package com.myspace.myspace.service.impl;

import com.myspace.myspace.mapper.PostMapper;
import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.util.TextUtils;
import com.myspace.myspace.dto.response.AdminPostResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.service.AdminPostsService;
import com.myspace.myspace.service.AuthorPostService;
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
public class AdminPostsServiceImpl implements AdminPostsService {

    private final PostRepository postRepository;
    private final AuthorPostService authorPostService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminPostResponse> getPosts(String search, String tag, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        String searchParam = (search != null && !search.trim().isEmpty()) ? TextUtils.unaccent(search) : null;
        String tagParam = (tag != null && !tag.trim().isEmpty()) ? tag.trim() : null;
        
        Page<Post> postsPage = postRepository.searchAdminPosts(searchParam, tagParam, pageable);
        
        List<AdminPostResponse> content = postsPage.getContent().stream()
                .map(PostMapper::toAdminResponse)
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
        return PostMapper.toAdminResponse(post);
    }

    @Override
    @Transactional
    public void deletePost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));

        // Dùng chung quy trình xóa của tác giả (media Cloudinary, dữ liệu con, Elasticsearch) thay vì chép lại
        authorPostService.deletePost(post.getAuthor().getId(), id);
    }
    
}
