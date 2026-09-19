package com.myspace.myspace.service.impl;

import com.myspace.myspace.dto.response.AdminDashboardResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.repository.CommentLikeRepository;
import com.myspace.myspace.repository.CommentRepository;
import com.myspace.myspace.repository.PostLikeRepository;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse getOverview() {
        long totalUsers = userRepository.count();
        long totalArticles = postRepository.count();
        long totalComments = commentRepository.count();
        long totalPostLikes = postLikeRepository.count();
        long totalCommentLikes = commentLikeRepository.count();
        long totalLikes = totalPostLikes + totalCommentLikes;

        Map<String, Long> usersByRole = mapResultToMap(userRepository.countUsersByRole());
        Map<String, Long> usersByStatus = mapResultToMap(userRepository.countUsersByStatus());
        List<AdminDashboardResponse.DashboardPoint> userGrowth = mapToPoints(userRepository.countUsersGrowthLast7Days());

        Long totalViews = postRepository.sumTotalViews();
        if (totalViews == null) totalViews = 0L;

        List<Post> topPostEntities = postRepository.findTopArticles(PageRequest.of(0, 5));
        List<AdminDashboardResponse.DashboardArticle> topArticles = topPostEntities.stream()
                .map(p -> AdminDashboardResponse.DashboardArticle.builder()
                        .id(String.valueOf(p.getId()))
                        .title(p.getTitle())
                        .viewCount(p.getViewCount())
                        .build())
                .collect(Collectors.toList());

        Map<String, Long> commentsByStatus = new HashMap<>(); // Status omitted in Comments entity

        return AdminDashboardResponse.builder()
                .summary(AdminDashboardResponse.Summary.builder()
                        .totalUsers(totalUsers)
                        .totalArticles(totalArticles)
                        .totalComments(totalComments)
                        .totalLikes(totalLikes)
                        .build())
                .users(AdminDashboardResponse.Users.builder()
                        .total(totalUsers)
                        .byRole(usersByRole)
                        .byStatus(usersByStatus)
                        .growth(userGrowth)
                        .build())
                .posts(AdminDashboardResponse.Posts.builder()
                        .total(totalArticles)
                        .totalViews(totalViews)
                        .topArticles(topArticles)
                        .build())
                .social(AdminDashboardResponse.Social.builder()
                        .comments(totalComments)
                        .commentsByStatus(commentsByStatus)
                        .postLikes(totalPostLikes)
                        .commentLikes(totalCommentLikes)
                        .totalLikes(totalLikes)
                        .build())
                .translations(new HashMap<>())
                .build();
    }

    private Map<String, Long> mapResultToMap(List<Object[]> results) {
        Map<String, Long> map = new HashMap<>();
        for (Object[] result : results) {
            String key = result[0] != null ? result[0].toString() : "unknown";
            Long count = result[1] != null ? ((Number) result[1]).longValue() : 0L;
            map.put(key, count);
        }
        return map;
    }

    private List<AdminDashboardResponse.DashboardPoint> mapToPoints(List<Object[]> results) {
        List<AdminDashboardResponse.DashboardPoint> points = new ArrayList<>();
        for (Object[] result : results) {
            String date = result[0] != null ? result[0].toString() : "";
            Long count = result[1] != null ? ((Number) result[1]).longValue() : 0L;
            points.add(AdminDashboardResponse.DashboardPoint.builder()
                    .date(date)
                    .count(count)
                    .build());
        }
        return points;
    }
}
