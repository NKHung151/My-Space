-- =====================================================================================
-- Hibernate chạy ở chế độ ddl-auto=validate: mọi thay đổi schema sau này phải thêm file mới V3__, V4__... (V2 là dữ liệu seed)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Người dùng & phân quyền
-- -------------------------------------------------------------------------------------
CREATE TABLE roles
(
    id   INT          NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_roles_name UNIQUE (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE users
(
    id                      BIGINT       NOT NULL AUTO_INCREMENT,
    email                   VARCHAR(255) NOT NULL,
    username                VARCHAR(255) NOT NULL,
    password                VARCHAR(255) NULL,
    full_name               VARCHAR(255) NULL,
    display_name            VARCHAR(255) NULL,
    unaccented_display_name VARCHAR(255) NULL,
    avatar_url              VARCHAR(512) NULL,
    bio                     TEXT         NULL,
    status                  VARCHAR(255) NULL COMMENT 'ACTIVE | INACTIVE | BANNED (so sánh không phân biệt hoa thường)',
    reset_otp               VARCHAR(6)   NULL,
    reset_otp_expiry        DATETIME(6)  NULL,
    reset_otp_attempts      INT          NULL COMMENT 'Số lần nhập sai OTP, quá 5 lần thì hủy OTP',
    role_id                 INT          NULL,
    last_seen_at            DATETIME(6)  NULL,
    created_at              DATETIME(6)  NULL,
    updated_at              DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE refresh_tokens
(
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    token       VARCHAR(255) NOT NULL,
    user_id     BIGINT       NOT NULL,
    expiry_date DATETIME(6)  NOT NULL,
    revoked     BIT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_token UNIQUE (token),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- -------------------------------------------------------------------------------------
-- Bài viết, bình luận, lượt thích, media
-- -------------------------------------------------------------------------------------
CREATE TABLE posts
(
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NULL,
    excerpt          TEXT         NULL,
    content          LONGTEXT     NULL,
    cover_image_url  VARCHAR(512) NULL,
    has_video        BOOLEAN      NULL DEFAULT FALSE,
    unaccented_title VARCHAR(255) NULL,
    tag              VARCHAR(255) NULL,
    unaccented_tag   VARCHAR(255) NULL,
    view_count       INT          NULL DEFAULT 0,
    like_count       INT          NULL DEFAULT 0,
    comment_count    INT          NULL DEFAULT 0,
    author_id        BIGINT       NOT NULL,
    published_at     DATETIME(6)  NULL,
    created_at       DATETIME(6)  NULL,
    updated_at       DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users (id),
    INDEX idx_posts_author_created (author_id, created_at),
    INDEX idx_posts_created (created_at),
    INDEX idx_posts_tag (tag)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE comments
(
    id                  BIGINT      NOT NULL AUTO_INCREMENT,
    content             TEXT        NOT NULL,
    like_count          INT         NULL DEFAULT 0,
    reply_count         INT         NULL DEFAULT 0,
    post_id             BIGINT      NOT NULL,
    author_id           BIGINT      NOT NULL,
    parent_id           BIGINT      NULL COMMENT 'Bình luận gốc (thread phẳng 1 cấp)',
    reply_to_comment_id BIGINT      NULL COMMENT 'Bình luận đang được trả lời trực tiếp',
    created_at          DATETIME(6) NULL,
    updated_at          DATETIME(6) NULL,
    PRIMARY KEY (id),
    -- Xóa bài -> xóa bình luận; xóa bình luận gốc -> xóa các trả lời; xóa bình luận đang được trả lời -> giữ reply, bỏ liên kết
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id),
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_reply_to FOREIGN KEY (reply_to_comment_id) REFERENCES comments (id) ON DELETE SET NULL,
    INDEX idx_comments_post_parent_created (post_id, parent_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE post_likes
(
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    post_id    BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    created_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_post_likes_post_user UNIQUE (post_id, user_id),
    CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE comment_likes
(
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    comment_id BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    created_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_comment_likes_comment_user UNIQUE (comment_id, user_id),
    CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE media_assets
(
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    public_id  VARCHAR(255) NOT NULL,
    url        VARCHAR(512) NOT NULL,
    media_type VARCHAR(255) NULL COMMENT 'image | video (audio cũng lưu là video theo Cloudinary)',
    mime_type  VARCHAR(255) NULL,
    owner_id   BIGINT       NOT NULL,
    status     VARCHAR(255) NULL COMMENT 'TEMPORARY (chưa gắn bài, job dọn sau 1 giờ) | ATTACHED',
    post_id    BIGINT       NULL COMMENT 'Không đặt FK: media được dọn bằng code khi xóa bài',
    created_at DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_media_assets_owner FOREIGN KEY (owner_id) REFERENCES users (id),
    INDEX idx_media_assets_url (url),
    INDEX idx_media_assets_status_created (status, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- -------------------------------------------------------------------------------------
-- Bạn bè
-- -------------------------------------------------------------------------------------
CREATE TABLE friend_requests
(
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    sender_id   BIGINT       NOT NULL,
    receiver_id BIGINT       NOT NULL,
    status      VARCHAR(255) NOT NULL DEFAULT 'pending' COMMENT 'pending | accepted | rejected',
    created_at  DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_friend_requests_pair UNIQUE (sender_id, receiver_id),
    CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT fk_friend_requests_receiver FOREIGN KEY (receiver_id) REFERENCES users (id),
    INDEX idx_friend_requests_receiver_status (receiver_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE friendships
(
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    user_id    BIGINT      NOT NULL,
    friend_id  BIGINT      NOT NULL,
    created_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_friendships_pair UNIQUE (user_id, friend_id),
    CONSTRAINT fk_friendships_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_friendships_friend FOREIGN KEY (friend_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- -------------------------------------------------------------------------------------
-- Nhắn tin & gọi thoại / video
-- -------------------------------------------------------------------------------------
CREATE TABLE conversations
(
    id                         BIGINT      NOT NULL AUTO_INCREMENT,
    user1_id                   BIGINT      NOT NULL COMMENT 'Luôn là id nhỏ hơn',
    user2_id                   BIGINT      NOT NULL,
    user1_last_read_message_id BIGINT      NULL,
    user2_last_read_message_id BIGINT      NULL,
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE calls
(
    id               BIGINT      NOT NULL AUTO_INCREMENT,
    conversation_id  BIGINT      NOT NULL,
    caller_id        BIGINT      NOT NULL,
    callee_id        BIGINT      NOT NULL,
    status           ENUM ('RINGING','ACCEPTED','ENDED','REJECTED','MISSED','CANCELLED','FAILED') NOT NULL DEFAULT 'RINGING',
    is_video         BIT         NULL DEFAULT 0,
    created_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Thời điểm bắt đầu đổ chuông',
    answered_at      DATETIME(6) NULL,
    ended_at         DATETIME(6) NULL,
    duration_seconds INT         NULL COMMENT 'Chỉ có khi cuộc gọi đã được nhận',
    end_reason       ENUM ('NORMAL','BUSY','NO_ANSWER','CALLER_CANCEL','CALLEE_REJECT','NETWORK_ERROR') NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_calls_parties CHECK (caller_id <> callee_id),
    CONSTRAINT fk_calls_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_calls_caller FOREIGN KEY (caller_id) REFERENCES users (id),
    CONSTRAINT fk_calls_callee FOREIGN KEY (callee_id) REFERENCES users (id),
    INDEX idx_calls_caller_created (caller_id, created_at),
    INDEX idx_calls_callee_created (callee_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE messages
(
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    conversation_id   BIGINT      NOT NULL,
    sender_id         BIGINT      NOT NULL,
    type              ENUM ('TEXT','CALL') NOT NULL DEFAULT 'TEXT',
    content           TEXT        NULL,
    call_id           BIGINT      NULL COMMENT 'Có giá trị khi type = CALL',
    client_message_id VARCHAR(64) NULL,
    is_read           BIT         NOT NULL DEFAULT 0,
    created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6) NULL,
    deleted_at        DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_messages_sender_client UNIQUE (sender_id, client_message_id),
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT fk_messages_call FOREIGN KEY (call_id) REFERENCES calls (id) ON DELETE SET NULL,
    INDEX idx_messages_conversation_created (conversation_id, created_at),
    INDEX idx_messages_unread (sender_id, is_read)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
