package com.myspace.myspace.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SHA-256 (hex) của token; token gốc chỉ nằm trong cookie HttpOnly của client
    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;

    private boolean revoked;

    // Thời điểm token bị đổi sang token mới (dùng cho khoảng ân hạn khi nhiều tab refresh cùng lúc)
    @Column(name = "rotated_at")
    private Instant rotatedAt;
}
