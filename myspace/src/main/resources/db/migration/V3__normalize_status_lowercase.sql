-- Chuẩn hóa trạng thái về chữ thường, khớp với code và FE ('active' | 'inactive' | 'banned').
-- V2 seed và luồng đăng ký cũ lưu 'ACTIVE' nên trang admin hiển thị sai là "Không hoạt động".
UPDATE users SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE friend_requests SET status = LOWER(status);

ALTER TABLE users MODIFY COLUMN status VARCHAR(255) NULL COMMENT 'active | inactive | banned';
