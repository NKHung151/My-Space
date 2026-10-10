-- Editor chưa từng gửi publish=true nên mọi bài cũ có published_at = NULL dù đã hiển thị công khai.
-- API công khai giờ chỉ trả bài đã xuất bản -> coi các bài cũ là đã xuất bản tại thời điểm tạo.
UPDATE posts SET published_at = created_at WHERE published_at IS NULL;

CREATE INDEX idx_posts_published ON posts (published_at);
