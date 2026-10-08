package com.myspace.myspace.service.search;

import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;

import java.util.List;

/**
 * Đồng bộ dữ liệu sang Elasticsearch. Index là dữ liệu phái sinh: lỗi ES chỉ được ghi log,
 * không làm hỏng nghiệp vụ chính (đăng ký, sửa bài...). Khởi động lại app sẽ reindex toàn bộ.
 */
public interface SearchIndexService {

    void indexUser(User user);

    void indexUsers(List<User> users);

    void indexPost(Post post);

    void indexPosts(List<Post> posts);

    void removePost(Long postId);
}
