-- Đếm số lần nhập sai OTP đặt lại mật khẩu (quá giới hạn thì hủy OTP)
ALTER TABLE users ADD COLUMN reset_otp_attempts INT NULL;
