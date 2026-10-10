package com.myspace.myspace.mapper;

import com.myspace.myspace.common.util.HtmlSanitizer;
import com.myspace.myspace.document.PostDocument;
import com.myspace.myspace.dto.response.AdminPostResponse;
import com.myspace.myspace.dto.response.PostDetailResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.dto.response.TagResponse;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Chuyển Post (entity / tài liệu Elasticsearch) sang các DTO hiển thị.
 * Mọi HTML/URL trả ra đều đi qua HtmlSanitizer (che cả dữ liệu cũ chưa được lọc khi lưu).
 */
public final class PostMapper {

    private static final int EXCERPT_WORD_LIMIT = 100;

    private PostMapper() {}

    /** Map Post → PostResponse (dùng cho danh sách, không kèm content đầy đủ). */
    public static PostResponse toResponse(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(HtmlSanitizer.sanitize(excerptOf(post)))
                .coverImageUrl(HtmlSanitizer.safeUrl(post.getCoverImageUrl()))
                .hasVideo(post.getHasVideo())
                .tag(post.getTag())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .author(UserMapper.toPublicUser(post.getAuthor()))
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .build();
    }

    /** Map Post → PostDetailResponse (dùng cho xem chi tiết, kèm content đầy đủ). */
    public static PostDetailResponse toDetailResponse(Post post) {
        return PostDetailResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(HtmlSanitizer.sanitize(excerptOf(post)))
                .content(HtmlSanitizer.sanitize(post.getContent()))
                .coverImageUrl(HtmlSanitizer.safeUrl(post.getCoverImageUrl()))
                .hasVideo(post.getHasVideo())
                .tag(post.getTag())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .author(UserMapper.toPublicUser(post.getAuthor()))
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    public static AdminPostResponse toAdminResponse(Post post) {
        User author = post.getAuthor();
        return AdminPostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(HtmlSanitizer.sanitize(post.getContent()))
                .tag(post.getTag())
                .createdAt(post.getCreatedAt())
                .author(AdminPostResponse.AdminPostAuthorResponse.builder()
                        .id(author.getId())
                        .displayName(author.getDisplayName())
                        .avatarUrl(author.getAvatarUrl())
                        .build())
                .build();
    }

    /** Kết quả tìm kiếm bài viết từ Elasticsearch (số đếm sẽ được service thay bằng số thật từ MySQL). */
    public static PostResponse toResponse(PostDocument doc) {
        return PostResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .slug(doc.getSlug())
                .excerpt(HtmlSanitizer.sanitize(doc.getExcerpt()))
                .coverImageUrl(HtmlSanitizer.safeUrl(doc.getCoverImageUrl()))
                .hasVideo(doc.getHasVideo())
                .tag(doc.getTag())
                .viewCount(doc.getViewCount())
                .likeCount(doc.getLikeCount())
                .commentCount(doc.getCommentCount())
                .author(PublicUserResponse.builder()
                        .id(doc.getAuthorId())
                        .displayName(doc.getAuthorDisplayName())
                        .username(doc.getAuthorUsername())
                        .avatarUrl(doc.getAuthorAvatarUrl())
                        .build())
                .publishedAt(doc.getPublishedAt())
                .createdAt(doc.getCreatedAt())
                .build();
    }

    public static PostDocument toDocument(Post post) {
        User author = post.getAuthor();
        return PostDocument.builder()
                .id(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .tag(post.getTag())
                .slug(post.getSlug())
                .coverImageUrl(post.getCoverImageUrl())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .hasVideo(post.getHasVideo())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .authorId(author != null ? author.getId() : null)
                .authorUsername(author != null ? author.getUsername() : null)
                .authorDisplayName(author != null ? author.getDisplayName() : null)
                .authorAvatarUrl(author != null ? author.getAvatarUrl() : null)
                .build();
    }

    /** Dòng kết quả của PostRepository.getPopularTags: [tag, count]. */
    public static TagResponse toTagResponse(Object[] row) {
        return new TagResponse((String) row[0], ((Number) row[1]).longValue());
    }

    private static String excerptOf(Post post) {
        String excerpt = post.getExcerpt();
        if ((excerpt == null || excerpt.trim().isEmpty()) && post.getContent() != null) {
            excerpt = generateHtmlExcerpt(post.getContent(), EXCERPT_WORD_LIMIT);
        }
        return excerpt;
    }

    private static String generateHtmlExcerpt(String html, int wordLimit) {
        Document doc = Jsoup.parseBodyFragment(html);
        doc.select("img, video, iframe").remove();

        AtomicInteger currentWords = new AtomicInteger(0);
        AtomicBoolean truncated = new AtomicBoolean(false);

        traverseAndTruncate(doc.body(), currentWords, truncated, wordLimit);

        String result = doc.body().html();
        if (truncated.get()) {
            result += "<!--TRUNCATED-->";
        }
        return result;
    }

    private static void traverseAndTruncate(Node node, AtomicInteger currentWords, AtomicBoolean truncated, int wordLimit) {
        if (truncated.get()) {
            node.remove();
            return;
        }
        if (node instanceof TextNode textNode) {
            String text = textNode.getWholeText();
            if (text.trim().isEmpty()) return;

            String[] words = text.trim().split("\\s+");
            if (currentWords.get() + words.length > wordLimit) {
                int allowed = wordLimit - currentWords.get();
                if (allowed > 0) {
                    textNode.text(String.join(" ", Arrays.copyOfRange(words, 0, allowed)) + "...");
                } else {
                    textNode.text("...");
                }
                currentWords.set(wordLimit + 1);
                truncated.set(true);
            } else {
                currentWords.addAndGet(words.length);
            }
        } else {
            List<Node> children = new ArrayList<>(node.childNodes());
            for (Node child : children) {
                traverseAndTruncate(child, currentWords, truncated, wordLimit);
            }
        }
    }
}
