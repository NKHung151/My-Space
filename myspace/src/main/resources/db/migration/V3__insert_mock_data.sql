-- Create 2 dummy posts
INSERT INTO posts (title, excerpt, content, author_id, view_count, like_count, comment_count, published_at, created_at, updated_at)
VALUES 
('Bài viết đầu tiên của tôi', 'Đây là đoạn tóm tắt', 'Nội dung chi tiết của bài viết đầu tiên trên hệ thống', 1, 150, 1, 1, NOW(), NOW(), NOW()),
('Chào mừng đến với My Space', 'Hướng dẫn sử dụng', 'Cùng khám phá các tính năng thú vị nhé!', 2, 50, 1, 0, NOW(), NOW(), NOW());

-- Like posts
INSERT INTO post_likes (post_id, user_id, created_at) VALUES (1, 2, NOW());
INSERT INTO post_likes (post_id, user_id, created_at) VALUES (2, 1, NOW());

-- Add a comment to Post 1
INSERT INTO comments (post_id, author_id, content, like_count, reply_count, created_at, updated_at)
VALUES (1, 2, 'Bài viết rất hay, cảm ơn admin!', 1, 0, NOW(), NOW());

-- Like the comment
INSERT INTO comment_likes (comment_id, user_id, created_at)
VALUES (1, 1, NOW());

-- Add Friendship between Admin (1) and User (2)
INSERT INTO friendships (user_id, friend_id, created_at) VALUES (1, 2, NOW());
INSERT INTO friendships (user_id, friend_id, created_at) VALUES (2, 1, NOW());

-- Add a pending Friend Request (from User to Admin, though they are already friends, just for mock data)
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at) 
VALUES (2, 1, 'ACCEPTED', NOW());
