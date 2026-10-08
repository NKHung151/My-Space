-- Dữ liệu khởi tạo tối thiểu để chạy hệ thống.
-- Tên role viết thường vì code (findByName("user")) và FE (role === 'admin') đều dùng chữ thường.

INSERT INTO roles (id, name)
VALUES (1, 'admin'),
       (2, 'user');

-- Tài khoản mẫu (đổi mật khẩu ngay sau khi đăng nhập lần đầu):
--   admin@myspace.com / Admin@123
--   user@myspace.com  / User@123
INSERT INTO users (email, username, password, full_name, display_name, unaccented_display_name, status, role_id, created_at, updated_at)
VALUES ('admin@myspace.com', 'admin', '$2a$10$Wsk2PZpICkLT/he6bnRZJeEDH1483eDrheqK8HrbYJBjagonCbrY.',
        'System Admin', 'System Admin', 'system admin', 'ACTIVE', 1, NOW(6), NOW(6)),
       ('user@myspace.com', 'user1', '$2a$10$Uf8ufAXWd2T2QNbk1yeTouwwBAk8xi1oJV8Vuv2RquslarLpx.lA2',
        'Normal User', 'Normal User', 'normal user', 'ACTIVE', 2, NOW(6), NOW(6));
