# Tài Liệu Cấu Trúc Phase 1.2 - Posts Module (Module Bài Viết)

Dưới đây là danh sách chi tiết các file đã được **THÊM MỚI** và **SỬA ĐỔI** trong dự án để phục vụ cho tính năng Quản lý Bài Viết (Giai đoạn 1.2).

---

## 1. Danh sách các File THÊM MỚI (Created)

### 1.1 Data Transfer Objects (DTOs)

**Request (dữ liệu gửi lên từ Client):**
- `myspace/.../dto/request/CreatePostRequest.java`: Body gửi lên khi tác giả tạo bài viết. Các field: `title` (bắt buộc, `@NotBlank`), `excerpt`, `content`, `coverImageUrl`, `hasVideo`, `tag`, `publish` (boolean — nếu true sẽ set `publishedAt = now()`).
- `myspace/.../dto/request/UpdatePostRequest.java`: Body gửi lên khi tác giả sửa bài viết. Tất cả field đều optional (PATCH semantics): `title`, `excerpt`, `content`, `coverImageUrl`, `hasVideo`, `tag`.

**Response (dữ liệu trả về cho Client):**
- `myspace/.../dto/response/PostResponse.java`: Dữ liệu bài viết **thu gọn** — dùng cho danh sách (Feed, My Posts). **Không có `content`**. Các field: `id`, `title`, `slug`, `excerpt`, `coverImageUrl`, `hasVideo`, `tag`, `viewCount`, `likeCount`, `commentCount`, `author` (PublicUserResponse), `publishedAt`, `createdAt`.
- `myspace/.../dto/response/PostDetailResponse.java`: Dữ liệu bài viết **chi tiết** — dùng khi xem 1 bài cụ thể. **Có thêm `content` và `updatedAt`**. Các field: `id`, `title`, `slug`, `excerpt`, `content`, `coverImageUrl`, `hasVideo`, `tag`, `viewCount`, `likeCount`, `commentCount`, `author` (PublicUserResponse), `publishedAt`, `createdAt`, `updatedAt`.
- `myspace/.../dto/response/TagResponse.java`: Dữ liệu trả về cho danh sách Tag phổ biến. Các field: `tag` (string), `count` (long).

### 1.2 Mapper

- `myspace/.../mapper/PostMapper.java`: **[THÊM MỚI]** Utility class tập trung toàn bộ logic mapping giữa `Post` entity và các DTO. Tránh duplicate code giữa 2 service. Gồm 3 method static:
  - `toResponse(Post)` → `PostResponse`
  - `toDetailResponse(Post)` → `PostDetailResponse`
  - `toPublicUser(User)` → `PublicUserResponse`

### 1.3 Service Layer

- `myspace/.../service/PublicPostService.java` (Interface) + `impl/PublicPostServiceImpl.java` (Implementation):
  - `getPublicPosts(q, tag, hasVideo, page, limit)`: Lấy danh sách bài viết công khai có filter và phân trang. Nếu có `q` → tìm qua **Elasticsearch**; nếu không → lấy từ **MySQL**.
  - `getPublicPost(id)`: Lấy chi tiết 1 bài theo ID.
  - `getPopularTags(limit)`: Lấy danh sách tag phổ biến nhất (GROUP BY + COUNT).
  - `increaseViewCount(id)`: Tăng `view_count` lên 1 khi người dùng đọc bài.

- `myspace/.../service/AuthorPostService.java` (Interface) + `impl/AuthorPostServiceImpl.java` (Implementation):
  - `createPost(authorId, request)`: Tạo bài viết mới, tự động đẩy vào Elasticsearch sau khi lưu MySQL.
  - `getMyPosts(authorId, page, limit)`: Lấy danh sách bài viết của chính tác giả, sắp xếp mới nhất trước.
  - `getMyPost(authorId, postId)`: Lấy chi tiết 1 bài (chỉ cho tác giả của bài đó).
  - `updatePost(authorId, postId, request)`: Cập nhật bài (PATCH — chỉ cập nhật field nào khác null). Đồng bộ lại Elasticsearch.
  - `deletePost(authorId, postId)`: Xóa bài. Xóa luôn khỏi Elasticsearch.

### 1.4 Controller Layer

- `myspace/.../controller/PublicPostController.java`: Prefix `/api/posts`. Không yêu cầu đăng nhập.

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/posts` | Lấy danh sách bài viết (filter: `q`, `tag`, `hasVideo`, `page`, `limit`) |
| GET | `/api/posts/{id}` | Xem chi tiết 1 bài viết |
| GET | `/api/posts/tags/popular` | Lấy tag phổ biến (`limit`, default 10) |
| POST | `/api/posts/{id}/view` | Ghi nhận 1 lượt xem |

- `myspace/.../controller/AuthorPostController.java`: Prefix `/api/author/posts`. **Bắt buộc đăng nhập** (JWT). `authorId` lấy tự động từ `@AuthenticationPrincipal`, client không cần gửi.

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/author/posts` | Tạo bài viết mới |
| GET | `/api/author/posts` | Lấy danh sách bài của mình (`page`, `limit`) |
| GET | `/api/author/posts/{id}` | Xem chi tiết 1 bài của mình (kể cả bản nháp) |
| PATCH | `/api/author/posts/{id}` | Sửa bài viết |
| DELETE | `/api/author/posts/{id}` | Xóa bài viết |

---

## 2. Danh sách các File SỬA ĐỔI (Modified)

### 2.1 Cấu Hình & Security

- `myspace/.../security/SecurityConfig.java`:
  - Bổ sung các path `/api/posts`, `/api/posts/**` vào `permitAll()` để người dùng vãng lai đọc bài viết công khai không bị chặn bởi Spring Security. (**Lưu ý:** prefix là `/api/...`, không phải `/api/v1/...`).

### 2.2 Repository

- `myspace/.../repository/PostRepository.java`:
  - Thêm `findByAuthorId(Long authorId, Pageable pageable)`: Lấy bài theo tác giả.
  - Thêm `findByIdAndAuthorId(Long id, Long authorId)`: Tìm bài theo ID + xác minh quyền sở hữu.
  - Thêm `@Query findPublicPosts(tag, hasVideo, pageable)`: Lấy bài công khai, lọc theo tag và hasVideo.
  - Thêm `@Query(nativeQuery) getPopularTags(limit)`: `GROUP BY tag ORDER BY count DESC`.

### 2.3 Elasticsearch Sync & Search

- `myspace/.../document/PostDocument.java`:
  - Bổ sung các field: `hasVideo`, `commentCount`, `createdAt`, `slug`, `coverImageUrl`, `likeCount`.

- `myspace/.../service/search/SearchQueryServiceImpl.java`:
  - Viết hoàn chỉnh `searchPosts(keyword, page, limit, tag, hasVideo)` — query Elasticsearch kết hợp `multi_match` (title, excerpt, tag) + filter `tag` + filter `hasVideo`.

- `myspace/.../service/search/impl/SearchIndexServiceImpl.java`:
  - Cập nhật `indexPost()` để đồng bộ đầy đủ các field mới vào Elasticsearch Index mỗi khi lưu bài viết.

### 2.4 Tối ưu Service

- `impl/PublicPostServiceImpl.java` và `impl/AuthorPostServiceImpl.java`:
  - Loại bỏ các private method mapping duplicate (`mapToResponse`, `mapToDetailResponse`, `mapAuthor`).
  - Thay bằng `PostMapper.toResponse()`, `PostMapper.toDetailResponse()` từ class Mapper chung.
  - Dùng `String.isBlank()` và `Boolean.TRUE.equals()` thay cho các null-check thủ công.
  - Dọn sạch các import thừa.

### 2.5 File Tài liệu (Docs)

- `postman.md` & `authPostman.md`: Cập nhật toàn bộ endpoint từ `/api/v1/...` sang `/api/...`.
