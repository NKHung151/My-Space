package com.myspace.myspace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "calls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Call {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caller_id", nullable = false)
    private User caller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "callee_id", nullable = false)
    private User callee;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CallStatus status = CallStatus.RINGING;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "end_reason", length = 30)
    @Enumerated(EnumType.STRING)
    private CallEndReason endReason;

    @Column(name = "is_video")
    private Boolean isVideo = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum CallStatus {
        RINGING, ACCEPTED, ENDED, REJECTED, MISSED, CANCELLED, FAILED
    }
    
    public enum CallEndReason {
        NORMAL, BUSY, NO_ANSWER, CALLER_CANCEL, CALLEE_REJECT, NETWORK_ERROR
    }
}
