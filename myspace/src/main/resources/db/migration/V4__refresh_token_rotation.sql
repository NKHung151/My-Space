-- Refresh token xoay vòng + lưu dạng hash.
-- Cột token giờ chứa SHA-256 (hex, 64 ký tự) của token; token gốc chỉ nằm trong cookie của client.
-- Token cũ đang lưu dạng gốc không còn dùng được -> xóa, người dùng đăng nhập lại 1 lần.
DELETE FROM refresh_tokens;

ALTER TABLE refresh_tokens
    ADD COLUMN rotated_at DATETIME(6) NULL COMMENT 'Thời điểm token bị đổi sang token mới (ân hạn 30s cho nhiều tab)';

CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens (expiry_date);
