package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.FriendshipRepository;
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
            List<UserDocument> searchResults = searchQueryService.searchUsers(cleanQuery, pageable.getPageNumber(), limit);
            
            List<PublicUserResponse> items = searchResults.stream()
                    .filter(doc -> currentUserId == null || !doc.getId().equals(currentUserId.toString()))
                    .map(doc -> {
                        Long userId = Long.valueOf(doc.getId());
                        return PublicUserResponse.builder()
                                .id(userId)
                                .displayName(doc.getDisplayName() != null ? doc.getDisplayName() : doc.getUsername())
                                .username(doc.getUsername())
                                .avatarUrl(doc.getAvatarUrl())
                                .bio(doc.getBio())
                                .isFriend(false)
                                .friendsCount(0L)
                                .build();
                    }).collect(Collectors.toList());

            return new PageResponse<>(items, new PageResponse.Meta((long) items.size(), page, limit, 1));
        } else {
            // Use MySQL for default recommendations
            Page<User> usersPage = userRepository.findAll(pageable);
            
            List<PublicUserResponse> items = usersPage.getContent().stream()
                    .filter(user -> currentUserId == null || !user.getId().equals(currentUserId))
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
                    
            return new PageResponse<>(items, new PageResponse.Meta(usersPage.getTotalElements(), page, limit, usersPage.getTotalPages()));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PublicUserResponse getProfile(Long currentUserId, Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

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
