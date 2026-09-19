package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;

public final class PostMapper {

    private PostMapper() {}

    /** Map Post → PostResponse (dùng cho danh sách, không kèm content đầy đủ). */
    public static PostResponse toResponse(Post post) {
        String excerpt = post.getExcerpt();
        if ((excerpt == null || excerpt.trim().isEmpty()) && post.getContent() != null) {
            excerpt = generateHtmlExcerpt(post.getContent(), 100);
        }

        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(excerpt)
                .coverImageUrl(post.getCoverImageUrl())
                .hasVideo(post.getHasVideo())
                .tag(post.getTag())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .author(toPublicUser(post.getAuthor()))
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .build();
    }

    /** Map Post → PostDetailResponse (dùng cho xem chi tiết, kèm content đầy đủ). */
    public static PostDetailResponse toDetailResponse(Post post) {
        String excerpt = post.getExcerpt();
        if ((excerpt == null || excerpt.trim().isEmpty()) && post.getContent() != null) {
            excerpt = generateHtmlExcerpt(post.getContent(), 100);
        }

        return PostDetailResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(excerpt)
                .content(post.getContent())
                .coverImageUrl(post.getCoverImageUrl())
                .hasVideo(post.getHasVideo())
                .tag(post.getTag())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .author(toPublicUser(post.getAuthor()))
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    /** Map User → PublicUserResponse (thông tin tác giả hiển thị công khai). */
    public static PublicUserResponse toPublicUser(User user) {
        return PublicUserResponse.builder()
                .id(user.getId())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(user.getRole() != null ? user.getRole().getName() : "member")
                .build();
    }

    private static String generateHtmlExcerpt(String html, int wordLimit) {
        org.jsoup.nodes.Document doc = org.jsoup.Jsoup.parseBodyFragment(html);
        doc.select("img, video, iframe").remove();
        
        java.util.concurrent.atomic.AtomicInteger currentWords = new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicBoolean truncated = new java.util.concurrent.atomic.AtomicBoolean(false);
        
        traverseAndTruncate(doc.body(), currentWords, truncated, wordLimit);
        
        String result = doc.body().html();
        if (truncated.get()) {
            result += "<!--TRUNCATED-->";
        }
        return result;
    }

    private static void traverseAndTruncate(org.jsoup.nodes.Node node, java.util.concurrent.atomic.AtomicInteger currentWords, java.util.concurrent.atomic.AtomicBoolean truncated, int wordLimit) {
        if (truncated.get()) {
            node.remove();
            return;
        }
        if (node instanceof org.jsoup.nodes.TextNode) {
            org.jsoup.nodes.TextNode textNode = (org.jsoup.nodes.TextNode) node;
            String text = textNode.getWholeText();
            if (text.trim().isEmpty()) return;
            
            String[] words = text.trim().split("\\s+");
            if (currentWords.get() + words.length > wordLimit) {
                int allowed = wordLimit - currentWords.get();
                if (allowed > 0) {
                    textNode.text(String.join(" ", java.util.Arrays.copyOfRange(words, 0, allowed)) + "...");
                } else {
                    textNode.text("...");
                }
                currentWords.set(wordLimit + 1);
                truncated.set(true);
            } else {
                currentWords.addAndGet(words.length);
            }
        } else {
            java.util.List<org.jsoup.nodes.Node> children = new java.util.ArrayList<>(node.childNodes());
            for (org.jsoup.nodes.Node child : children) {
                traverseAndTruncate(child, currentWords, truncated, wordLimit);
            }
        }
    }
}
