package com.myspace.myspace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AdminDashboardResponse {

    private Summary summary;
    private Users users;
    private Posts posts;
    private Social social;

    @Data
    @Builder
    public static class Summary {
        private long totalUsers;
        private long totalArticles;
        private long totalComments;
        private long totalLikes;
    }

    @Data
    @Builder
    public static class Users {
        private long total;
        private Map<String, Long> byRole;
        private Map<String, Long> byStatus;
        private List<DashboardPoint> growth;
    }

    @Data
    @Builder
    public static class DashboardPoint {
        private String date;
        private long count;
    }

    @Data
    @Builder
    public static class Posts {
        private long total;
        private long totalViews;
        private List<DashboardArticle> topArticles;
    }

    @Data
    @Builder
    public static class DashboardArticle {
        private String id;
        private String title;
        private long viewCount;
    }

    @Data
    @Builder
    public static class Social {
        private long comments;
        private long postLikes;
        private long commentLikes;
        private long totalLikes;
    }
}
