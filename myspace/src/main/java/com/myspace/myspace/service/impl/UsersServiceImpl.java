package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.UsersService;
import com.myspace.myspace.service.search.SearchQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService {

    private final UserRepository userRepository;
    private final SearchQueryService searchQueryService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PublicUserResponse> getRecommendedUsers(Long currentUserId, String query, int page, int limit) {
        Pageable pageable = PageRequest.of(page > 0 ? page - 1 : 0, limit);

        if (query != null && !query.trim().isEmpty()) {
            // Use Elasticsearch
            String cleanQuery = query.trim().startsWith("@") ? query.trim().substring(1) : query.trim();
            // Loại chính mình ngay trong truy vấn ES (trước đây so Long với String nên không bao giờ loại được)
            SearchQueryService.SearchPage<UserDocument> result =
                    searchQueryService.searchUsers(cleanQuery, pageable.getPageNumber(), limit, currentUserId);

            List<PublicUserResponse> items = result.items().stream()
                    .map(doc -> {
                        return PublicUserResponse.builder()
                                .id(doc.getId())
                                .displayName(doc.getDisplayName() != null ? doc.getDisplayName() : doc.getUsername())
                                .username(doc.getUsername())
                                .avatarUrl(doc.getAvatarUrl())
                                .bio(doc.getBio())
                                .isFriend(false)
                                .friendsCount(0L)
                                .build();
                    }).collect(Collectors.toList());

            int totalPages = (int) Math.ceil((double) result.total() / Math.max(limit, 1));
            return new PageResponse<>(items, new PageResponse.Meta(result.total(), page, limit, totalPages));
        } else {
            // Use MySQL for default recommendations
            // Loại chính mình trong câu truy vấn, không lọc sau khi đã phân trang (trang bị thiếu 1 người)
            Page<User> usersPage = currentUserId == null
                    ? userRepository.findAll(pageable)
                    : userRepository.findByIdNot(currentUserId, pageable);

            List<PublicUserResponse> items = usersPage.getContent().stream()
                    .map(user -> {
                        return PublicUserResponse.builder()
                                .id(user.getId())
                                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                                .username(user.getUsername())
                                .avatarUrl(user.getAvatarUrl())
                                .bio(user.getBio())
                                .role(user.getRole() != null ? user.getRole().getName() : "member")
                                .isFriend(false)
                                .friendsCount(0L)
                                .build();
                    }).collect(Collectors.toList());

            return new PageResponse<>(items,
                    new PageResponse.Meta(usersPage.getTotalElements(), page, limit, usersPage.getTotalPages()));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PublicUserResponse getProfile(Long currentUserId, Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ."));

        return PublicUserResponse.builder()
                .id(user.getId())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(user.getRole() != null ? user.getRole().getName() : "member")
                .isFriend(false)
                .friendsCount(0L)
                .build();
    }
}
