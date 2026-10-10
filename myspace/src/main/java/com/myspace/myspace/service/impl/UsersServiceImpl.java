package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.util.Paging;
import com.myspace.myspace.mapper.UserMapper;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.document.UserDocument;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.FriendshipRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.UsersService;
import com.myspace.myspace.service.search.SearchQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final SearchQueryService searchQueryService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PublicUserResponse> getRecommendedUsers(Long currentUserId, String query, int page, int limit) {
        Pageable pageable = Paging.of(page, limit);

        if (query != null && !query.trim().isEmpty()) {
            // Use Elasticsearch
            String cleanQuery = query.trim().startsWith("@") ? query.trim().substring(1) : query.trim();
            // Loại chính mình ngay trong truy vấn ES (trước đây so Long với String nên không bao giờ loại được)
            SearchQueryService.SearchPage<UserDocument> result =
                    searchQueryService.searchUsers(cleanQuery, pageable.getPageNumber(), pageable.getPageSize(), currentUserId);

            List<PublicUserResponse> items = result.items().stream()
                    .map(UserMapper::toPublicUser)
                    .toList();
            populateFriendship(items, currentUserId);

            return PageResponse.of(items, result.total(), pageable);
        }

        // Use MySQL for default recommendations
        // Loại chính mình trong câu truy vấn, không lọc sau khi đã phân trang (trang bị thiếu 1 người)
        Page<User> usersPage = currentUserId == null
                ? userRepository.findAll(pageable)
                : userRepository.findByIdNot(currentUserId, pageable);

        List<PublicUserResponse> items = usersPage.getContent().stream().map(UserMapper::toPublicUser).toList();
        populateFriendship(items, currentUserId);

        return PageResponse.of(usersPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public PublicUserResponse getProfile(Long currentUserId, Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ."));

        PublicUserResponse response = UserMapper.toPublicUser(user);
        populateFriendship(List.of(response), currentUserId);
        return response;
    }


    private void populateFriendship(List<PublicUserResponse> items, Long currentUserId) {
        if (items.isEmpty()) return;
        List<Long> ids = items.stream().map(PublicUserResponse::getId).toList();

        Map<Long, Long> friendCounts = new HashMap<>();
        for (Object[] row : friendshipRepository.countFriendsByUserIds(ids)) {
            friendCounts.put((Long) row[0], ((Number) row[1]).longValue());
        }
        Set<Long> friendIds = currentUserId == null
                ? Set.of()
                : new HashSet<>(friendshipRepository.findFriendIdsAmong(currentUserId, ids));

        items.forEach(item -> {
            item.setFriendsCount(friendCounts.getOrDefault(item.getId(), 0L));
            item.setFriend(friendIds.contains(item.getId()));
        });
    }
}
