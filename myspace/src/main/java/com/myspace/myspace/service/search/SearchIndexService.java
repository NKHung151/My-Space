package com.myspace.myspace.service.search;

import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;

import java.util.List;

// Đồng bộ dữ liệu sang Elasticsearch. Index là dữ liệu phái sinh: lỗi ES chỉ được ghi log,
// không làm hỏng nghiệp vụ chính (đăng ký, sửa bài...). Khởi động lại app sẽ reindex toàn bộ.
public interface SearchIndexService {

    // Ghi sau khi transaction hiện tại commit (rollback thì không ghi).
    void indexUser(User user);

    // Bulk, ghi ngay — chỉ dùng cho reindex toàn bộ (không giữ cả nghìn document chờ tới cuối transaction).
    void indexUsers(List<User> users);

    //Ghi sau khi transaction hiện tại commit (rollback thì không ghi).
    void indexPost(Post post);

    // Bulk, ghi ngay — chỉ dùng cho reindex toàn bộ.
    void indexPosts(List<Post> posts);

    // Xóa sau khi transaction hiện tại commit.
    void removePost(Long postId);
}
