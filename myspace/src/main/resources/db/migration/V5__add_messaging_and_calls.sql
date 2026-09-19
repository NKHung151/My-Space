ALTER TABLE users
    ADD COLUMN last_seen_at DATETIME(6) NULL;

UPDATE friend_requests
SET status = 'PENDING'
WHERE status IS NULL;

ALTER TABLE friend_requests
    MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'PENDING';

-- Index cho danh sách lời mời đến
CREATE INDEX idx_friend_requests_receiver_status
    ON friend_requests (receiver_id, status);

CREATE TABLE conversations
(
    id                         BIGINT      NOT NULL AUTO_INCREMENT,
    user1_id                   BIGINT      NOT NULL,
    user2_id                   BIGINT      NOT NULL,
    user1_last_read_message_id BIGINT      NULL COMMENT 'Tin cuối user1 đã đọc',
    user2_last_read_message_id BIGINT      NULL COMMENT 'Tin cuối user2 đã đọc',
    last_message_id            BIGINT      NULL COMMENT 'Không đặt FK để tránh vòng phụ thuộc với messages',
    last_message_at            DATETIME(6) NULL,
    created_at                 DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_conversations_pair UNIQUE (user1_id, user2_id),
    CONSTRAINT chk_conversations_order CHECK (user1_id < user2_id),
    CONSTRAINT fk_conversations_user1 FOREIGN KEY (user1_id) REFERENCES users (id),
    CONSTRAINT fk_conversations_user2 FOREIGN KEY (user2_id) REFERENCES users (id),
    INDEX idx_conversations_user2 (user2_id),
    INDEX idx_conversations_last_message_at (last_message_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE calls
(
    id               BIGINT      NOT NULL AUTO_INCREMENT,
    conversation_id  BIGINT      NOT NULL,
    caller_id        BIGINT      NOT NULL,
    callee_id        BIGINT      NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'RINGING',
    created_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Thời điểm bắt đầu đổ chuông',
    answered_at      DATETIME(6) NULL,
    ended_at         DATETIME(6) NULL,
    duration_seconds INT         NULL COMMENT 'Chỉ có khi cuộc gọi đã được nhận',
    end_reason       VARCHAR(30) NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_calls_status CHECK (status IN
        ('RINGING', 'ACCEPTED', 'ENDED', 'REJECTED', 'MISSED', 'CANCELLED', 'FAILED')),
    CONSTRAINT chk_calls_parties CHECK (caller_id <> callee_id),
    CONSTRAINT fk_calls_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_calls_caller FOREIGN KEY (caller_id) REFERENCES users (id),
    CONSTRAINT fk_calls_callee FOREIGN KEY (callee_id) REFERENCES users (id),
    INDEX idx_calls_caller_created (caller_id, created_at),
    INDEX idx_calls_callee_created (callee_id, created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE messages
(
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    conversation_id   BIGINT      NOT NULL,
    sender_id         BIGINT      NOT NULL,
    type              VARCHAR(10) NOT NULL DEFAULT 'TEXT',
    content           TEXT        NULL COMMENT 'Tối đa 5000 ký tự (kiểm tra ở service)',
    call_id           BIGINT      NULL COMMENT 'Có giá trị khi type = CALL',
    client_message_id VARCHAR(64) NULL,
    created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_at        DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_messages_type CHECK (type IN ('TEXT', 'CALL')),
    CONSTRAINT uk_messages_sender_client UNIQUE (sender_id, client_message_id),
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT fk_messages_call FOREIGN KEY (call_id) REFERENCES calls (id) ON DELETE SET NULL,
    INDEX idx_messages_conversation_id (conversation_id, id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
