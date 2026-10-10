package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.util.Paging;
import com.myspace.myspace.common.exception.AppException;
import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.CreateCommentRequest;
import com.myspace.myspace.dto.request.UpdateCommentRequest;
import com.myspace.myspace.dto.response.CommentResponse;
import com.myspace.myspace.entity.Comment;
import com.myspace.myspace.entity.Post;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.mapper.CommentMapper;
import com.myspace.myspace.repository.CommentRepository;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.repository.CommentLikeRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getCommentsByPost(Long postId, int page, int limit, Long currentUserId) {
        Pageable pageable = Paging.of(page, limit);
        Page<Comment> commentPage = commentRepository.findByPostIdAndParentIsNullOrderByCreatedAtDesc(postId, pageable);

        List<Comment> rootComments = commentPage.getContent();
        
        // TỐI ƯU HÓA: Lấy tất cả câu trả lời cho các bình luận gốc trong 1 lần query (Chống N+1 query)
        List<Long> rootCommentIds = rootComments.stream().map(Comment::getId).collect(Collectors.toList());
        List<Comment> allReplies = commentRepository.findByParentIdInOrderByCreatedAtAsc(rootCommentIds);
        
        // Gom nhóm các câu trả lời theo ID của bình luận cha
        java.util.Map<Long, List<Comment>> repliesByParentId = allReplies.stream()
                .collect(Collectors.groupingBy(reply -> reply.getParent().getId()));

        List<CommentResponse> items = rootComments.stream()
                .map(comment -> {
                    CommentResponse response = CommentMapper.toResponse(comment, currentUserId);
                    List<Comment> replies = repliesByParentId.getOrDefault(comment.getId(), List.of());
                    response.setReplies(replies.stream()
                            .map(reply -> CommentMapper.toResponse(reply, currentUserId))
                            .collect(Collectors.toList()));
                    return response;
                })
                .collect(Collectors.toList());

        long totalComments = commentRepository.countByPostId(postId);

        // Populate Liked Status
        if (currentUserId != null && !items.isEmpty()) {
            List<Long> allCommentIds = new java.util.ArrayList<>();
            for (CommentResponse item : items) {
                allCommentIds.add(item.getId());
                if (item.getReplies() != null) {
                    allCommentIds.addAll(item.getReplies().stream().map(CommentResponse::getId).collect(Collectors.toList()));
                }
            }
            List<Long> likedCommentIds = commentLikeRepository.findLikedCommentIds(currentUserId, allCommentIds);
            for (CommentResponse item : items) {
                item.setLiked(likedCommentIds.contains(item.getId()));
                if (item.getReplies() != null) {
                    item.getReplies().forEach(reply -> reply.setLiked(likedCommentIds.contains(reply.getId())));
                }
            }
        }

        // Cố ý khác PageResponse.of: total = tổng mọi bình luận (cả trả lời) để FE hiển thị "N bình luận",
        // còn totalPages tính theo bình luận gốc (đơn vị phân trang)
        return new PageResponse<>(items, new PageResponse.Meta(
                totalComments, commentPage.getNumber() + 1, commentPage.getSize(), commentPage.getTotalPages()));
    }

    @Override
    @Transactional
    public CommentResponse createComment(Long postId, Long authorId, CreateCommentRequest request) {
        // Khóa dòng bài viết trước khi insert bình luận + cập nhật bộ đếm (tránh deadlock khi bình luận đồng thời)
        Post post = postRepository.findByIdForUpdate(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(request.getContent());

        // FLAT-THREAD LOGIC
        // Dù là reply cho root hay reply cho 1 reply khác, parent luôn là root comment
        if (request.getParentId() != null || request.getReplyToCommentId() != null) {
            Long targetId = request.getReplyToCommentId() != null ? request.getReplyToCommentId() : request.getParentId();
            Comment target = commentRepository.findById(targetId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận."));

            Comment parent = target.getParent() != null ? target.getParent() : target;
            comment.setParent(parent);
            
            // Cập nhật số lượng câu trả lời của bình luận cha
            commentRepository.addReplyCount(parent.getId(), 1);

            // Gán replyToComment
            comment.setReplyToComment(target);
        }

        Comment savedComment = commentRepository.save(comment);
        
        // Tăng số đếm bình luận của bài viết
        postRepository.addCommentCount(postId, 1);

        return CommentMapper.toResponse(savedComment, authorId);
    }

    @Override
    @Transactional
    public CommentResponse updateComment(Long commentId, Long authorId, UpdateCommentRequest request) {
        Comment comment = commentRepository.findByIdAndAuthorId(commentId, authorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận."));

        comment.setContent(request.getContent());
        Comment updatedComment = commentRepository.save(comment);
        
        return CommentMapper.toResponse(updatedComment, authorId);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận."));

        boolean isAuthor = comment.getAuthor().getId().equals(userId);
        boolean isPostAuthor = comment.getPost().getAuthor().getId().equals(userId);

        if (!isAuthor && !isPostAuthor) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa bình luận này.");
        }

        // Chuẩn bị cập nhật các bộ đếm (khóa dòng bài viết như khi tạo bình luận)
        Post post = postRepository.findByIdForUpdate(comment.getPost().getId()).orElseThrow();
        long commentsToDelete = 1; 

        // 1. Xử lý các bình luận đang "reply" trực tiếp vào bình luận này (để tránh lỗi FK reply_to_comment_id)
        List<Comment> referencingComments = commentRepository.findByReplyToCommentId(comment.getId());
        if (!referencingComments.isEmpty()) {
            for (Comment ref : referencingComments) {
                ref.setReplyToComment(null);
            }
            commentRepository.saveAll(referencingComments);
        }

        // 2. Lấy tất cả các bình luận con (nếu có, ví dụ do lỗi dữ liệu cũ hoặc là root comment)
        List<Comment> children = commentRepository.findByParentIdOrderByCreatedAtAsc(comment.getId());
        if (!children.isEmpty()) {
            commentsToDelete += children.size();
            // Xóa tất cả các like của các bình luận con TRƯỚC KHI xóa
            List<Long> childIds = children.stream().map(Comment::getId).collect(Collectors.toList());
            commentLikeRepository.deleteByCommentIdIn(childIds);
            
            // Xóa tất cả các bình luận con
            commentRepository.deleteAll(children);
        }

        // 3. Giảm số lượng câu trả lời của bình luận cha (nếu đang xóa một reply)
        if (comment.getParent() != null) {
            Comment parent = comment.getParent();
            commentRepository.addReplyCount(parent.getId(), -1);
        }

        // 4. Cập nhật số đếm của bài viết
        postRepository.addCommentCount(post.getId(), (int) -commentsToDelete);

        // 5. Xóa likes của bình luận mục tiêu và sau đó xóa bình luận
        commentLikeRepository.deleteByCommentId(comment.getId());
        commentRepository.delete(comment);
    }
}
