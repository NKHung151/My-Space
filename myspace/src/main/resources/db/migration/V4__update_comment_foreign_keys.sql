-- Thay đổi cờ của Khóa ngoại để đẩy việc xóa cho MySQL xử lý

-- 1. Xóa khóa ngoại cũ
ALTER TABLE comments DROP FOREIGN KEY FKlri30okf66phtcgbe5pok7cc0;
ALTER TABLE comments DROP FOREIGN KEY FK9cnyv7g9gt5qgsci8uy6sc7d6;

-- 2. Thêm khóa ngoại mới với ON DELETE CASCADE cho parent_id
ALTER TABLE comments 
    ADD CONSTRAINT FK_comments_parent_id 
    FOREIGN KEY (parent_id) 
    REFERENCES comments (id) 
    ON DELETE CASCADE;

-- 3. Thêm khóa ngoại mới với ON DELETE SET NULL cho reply_to_comment_id
ALTER TABLE comments 
    ADD CONSTRAINT FK_comments_reply_to_comment_id 
    FOREIGN KEY (reply_to_comment_id) 
    REFERENCES comments (id) 
    ON DELETE SET NULL;
