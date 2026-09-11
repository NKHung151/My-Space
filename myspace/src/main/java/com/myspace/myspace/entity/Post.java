package com.myspace.myspace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String slug;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(name = "has_video", columnDefinition = "boolean default false")
    private Boolean hasVideo = false;

    @Column(name = "unaccented_title")
    private String unaccentedTitle;

    private String tag;

    @Column(name = "unaccented_tag")
    private String unaccentedTag;

    @Column(name = "view_count", columnDefinition = "int default 0")
    private Integer viewCount = 0;

    @Column(name = "like_count", columnDefinition = "int default 0")
    private Integer likeCount = 0;

    @Column(name = "comment_count", columnDefinition = "int default 0")
    private Integer commentCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
