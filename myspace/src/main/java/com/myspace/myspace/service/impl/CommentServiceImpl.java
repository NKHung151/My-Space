package com.myspace.myspace.service.impl;

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
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getCommentsByPost(Long postId, int page, int limit, Long currentUserId, String currentUserRole) {
        Pageable pageable = PageRequest.of(page > 0 ? page - 1 : 0, limit);
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
                    CommentResponse response = CommentMapper.toResponse(comment, currentUserId, currentUserRole);
                    List<Comment> replies = repliesByParentId.getOrDefault(comment.getId(), List.of());
                    response.setReplies(replies.stream()
                            .map(reply -> CommentMapper.toResponse(reply, currentUserId, currentUserRole))
                            .collect(Collectors.toList()));
                    return response;
                })
                .collect(Collectors.toList());

        return new PageResponse<>(items, new PageResponse.Meta(commentPage.getTotalElements(), page, limit, commentPage.getTotalPages()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentResponse> getReplies(Long commentId, Long currentUserId, String currentUserRole) {
        return commentRepository.findByParentIdOrderByCreatedAtAsc(commentId).stream()
                .map(comment -> CommentMapper.toResponse(comment, currentUserId, currentUserRole))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CommentResponse createComment(Long postId, Long authorId, CreateCommentRequest request, String currentUserRole) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(request.getContent());

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParent(parent);
            
            // Cập nhật số lượng câu trả lời của bình luận cha
            parent.setReplyCount(parent.getReplyCount() + 1);
            commentRepository.save(parent);
        }

        if (request.getReplyToCommentId() != null) {
            Comment replyTo = commentRepository.findById(request.getReplyToCommentId())
                    .orElseThrow(() -> new RuntimeException("ReplyTo comment not found"));
            comment.setReplyToComment(replyTo);
        }

        Comment savedComment = commentRepository.save(comment);
        
        // Tăng số đếm bình luận của bài viết
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        return CommentMapper.toResponse(savedComment, authorId, currentUserRole);
    }

    @Override
    @Transactional
    public CommentResponse updateComment(Long commentId, Long authorId, UpdateCommentRequest request, String currentUserRole) {
        Comment comment = commentRepository.findByIdAndAuthorId(commentId, authorId)
                .orElseThrow(() -> new RuntimeException("Comment not found or you don't have permission"));

        comment.setContent(request.getContent());
        Comment updatedComment = commentRepository.save(comment);
        
        return CommentMapper.toResponse(updatedComment, authorId, currentUserRole);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, Long userId, String userRole) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        boolean isAuthor = comment.getAuthor().getId().equals(userId);
        boolean isPostAuthor = comment.getPost().getAuthor().getId().equals(userId);
        boolean isAdmin = "admin".equalsIgnoreCase(userRole);

        if (!isAuthor && !isPostAuthor && !isAdmin) {
            throw new RuntimeException("You do not have permission to delete this comment");
        }

        // Chuẩn bị cập nhật các bộ đếm
        Post post = comment.getPost();
        
        // Tính toán số lượng bình luận sẽ bị xóa (Bình luận này + tất cả câu trả lời của nó)
        long commentsToDelete = 1; 
        if (comment.getParent() == null) {
            commentsToDelete += commentRepository.countByParentId(comment.getId());
        } else {
            // Giảm số lượng câu trả lời của bình luận cha
            Comment parent = comment.getParent();
            parent.setReplyCount(Math.max(0, parent.getReplyCount() - 1));
            commentRepository.save(parent);
        }

        post.setCommentCount(Math.max(0, (int) (post.getCommentCount() - commentsToDelete)));
        postRepository.save(post);

        // Spring Data JPA không tự động xóa theo tầng (CascadeType.REMOVE) do cấu hình Entity,
        // Nên ta phải tự động xóa các bình luận con trước khi xóa bình luận cha.
        if (comment.getParent() == null) {
            List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(commentId);
            commentRepository.deleteAll(replies);
        }

        commentRepository.delete(comment);
    }
}
