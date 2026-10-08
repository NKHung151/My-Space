package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.FriendRequestResponse;
import com.myspace.myspace.dto.response.FriendshipStatusResponse;
import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.entity.FriendRequest;
import com.myspace.myspace.entity.Friendship;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.mapper.PostMapper;
import com.myspace.myspace.repository.FriendRequestRepository;
import com.myspace.myspace.repository.FriendshipRepository;
import com.myspace.myspace.repository.PostLikeRepository;
import com.myspace.myspace.repository.PostRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.FriendService;
import com.myspace.myspace.service.ViewCountService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FriendServiceImpl implements FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final ViewCountService viewCountService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public void sendRequest(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new IllegalArgumentException("Cannot send friend request to yourself");
        }
        if (friendshipRepository.existsByUserIdAndFriendId(currentUserId, targetUserId)) {
            throw new IllegalArgumentException("Already friends");
        }
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(currentUserId, targetUserId, "pending")) {
            throw new IllegalArgumentException("Friend request already sent");
        }
        // Auto-accept if reverse pending request exists
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(targetUserId, currentUserId, "pending")) {
            acceptRequest(currentUserId, targetUserId);
            return;
        }

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        User receiver = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));
        // Bảng có unique (sender_id, receiver_id): nếu lời mời cũ đã bị từ chối thì dùng lại bản ghi đó,
        // insert thêm bản ghi mới sẽ vi phạm unique (trước đây trả lỗi 500)
        FriendRequest request = friendRequestRepository.findBySenderIdAndReceiverId(currentUserId, targetUserId)
                .orElseGet(FriendRequest::new);
        request.setSender(sender);
        request.setReceiver(receiver);
        request.setStatus("pending");
        friendRequestRepository.save(request);

        // Push real-time notification to the receiver (dùng email = principal name của WebSocket)
        FriendRequestResponse response = FriendRequestResponse.builder()
                .id(request.getId())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .sender(PostMapper.toPublicUser(sender))
                .build();
        log.info("[WS] Sending friend-request notification to user: {}", receiver.getEmail());
        messagingTemplate.convertAndSendToUser(
                receiver.getEmail(),
                "/queue/friend-requests",
                response
        );
        log.info("[WS] Sent friend-request notification successfully");
    }

    @Override
    @Transactional
    public void acceptRequest(Long currentUserId, Long senderId) {
        FriendRequest request = friendRequestRepository
                .findBySenderIdAndReceiverIdAndStatus(senderId, currentUserId, "pending")
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        request.setStatus("accepted");
        friendRequestRepository.save(request);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));
        User senderUser = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        if (!friendshipRepository.existsByUserIdAndFriendId(currentUserId, senderId)) {
            Friendship f1 = new Friendship();
            f1.setUser(currentUser);
            f1.setFriend(senderUser);
            friendshipRepository.save(f1);
        }
        if (!friendshipRepository.existsByUserIdAndFriendId(senderId, currentUserId)) {
            Friendship f2 = new Friendship();
            f2.setUser(senderUser);
            f2.setFriend(currentUser);
            friendshipRepository.save(f2);
        }

        // Thông báo cho người GỬI lời mời: lời mời đã được chấp nhận (dùng email = principal name)
        PublicUserResponse currentUserResponse = PostMapper.toPublicUser(currentUser);
        messagingTemplate.convertAndSendToUser(
                senderUser.getEmail(),
                "/queue/friend-accept",
                currentUserResponse
        );

        // Thông báo cho người CHẤP NHẬN (currentUser): thêm senderUser vào danh sách bạn
        PublicUserResponse senderResponse = PostMapper.toPublicUser(senderUser);
        messagingTemplate.convertAndSendToUser(
                currentUser.getEmail(),
                "/queue/friend-accept",
                senderResponse
        );
    }

    @Override
    @Transactional
    public void rejectRequest(Long currentUserId, Long senderId) {
        FriendRequest request = friendRequestRepository
                .findBySenderIdAndReceiverIdAndStatus(senderId, currentUserId, "pending")
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));
        request.setStatus("rejected");
        friendRequestRepository.save(request);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Báo cho người từ chối (currentUser) biết để ẩn lời mời khỏi giao diện
        messagingTemplate.convertAndSendToUser(
                currentUser.getEmail(),
                "/queue/friend-reject",
                senderId
        );
    }

    @Override
    @Transactional
    public void removeFriend(Long currentUserId, Long friendId) {
        friendshipRepository.deleteByUserIdAndFriendIdBidirectional(currentUserId, friendId);
        friendRequestRepository.deleteBySenderIdAndReceiverIdBidirectional(currentUserId, friendId);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User friendUser = userRepository.findById(friendId)
                .orElseThrow(() -> new IllegalArgumentException("Friend not found"));

        // Báo cho người bị xóa (friendUser) biết rằng currentUserId đã không còn là bạn
        messagingTemplate.convertAndSendToUser(
                friendUser.getEmail(),
                "/queue/friend-remove",
                currentUserId
        );

        // Báo cho người chủ động xóa (currentUser) biết để tự xóa friendId khỏi danh sách
        messagingTemplate.convertAndSendToUser(
                currentUser.getEmail(),
                "/queue/friend-remove",
                friendId
        );
    }

    @Override
    public List<PublicUserResponse> getFriends(Long userId) {
        return friendshipRepository.findFriendsByUserId(userId).stream()
                .map(PostMapper::toPublicUser)
                .collect(Collectors.toList());
    }

    @Override
    public List<FriendRequestResponse> getPendingRequests(Long currentUserId) {
        return friendRequestRepository.findByReceiverIdAndStatus(currentUserId, "pending").stream()
                .map(req -> FriendRequestResponse.builder()
                        .id(req.getId())
                        .status(req.getStatus())
                        .createdAt(req.getCreatedAt())
                        .sender(PostMapper.toPublicUser(req.getSender()))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public FriendshipStatusResponse getFriendshipStatus(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) return new FriendshipStatusResponse("none");
        if (friendshipRepository.existsByUserIdAndFriendId(currentUserId, targetUserId)) return new FriendshipStatusResponse("friends");
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(currentUserId, targetUserId, "pending")) return new FriendshipStatusResponse("pending_sent");
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(targetUserId, currentUserId, "pending")) return new FriendshipStatusResponse("pending_received");
        return new FriendshipStatusResponse("none");
    }

    @Override
    public PageResponse<PostResponse> getFriendsFeed(Long currentUserId, int page, int limit) {
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<com.myspace.myspace.entity.Post> postsPage = postRepository.findPostsByFriendship(currentUserId, pageable);

        List<PostResponse> items = postsPage.getContent().stream()
                .map(PostMapper::toResponse)
                .collect(Collectors.toList());

        if (!items.isEmpty()) {
            List<Long> postIds = items.stream().map(PostResponse::getId).collect(Collectors.toList());
            List<Long> likedIds = postLikeRepository.findLikedPostIds(currentUserId, postIds);
            java.util.Map<Long, Long> pendingViews = viewCountService.getPendingViewCounts(postIds);
            items.forEach(item -> {
                item.setLiked(likedIds.contains(item.getId()));
                item.setViewCount(item.getViewCount() + pendingViews.getOrDefault(item.getId(), 0L).intValue());
            });
        }

        return new PageResponse<>(items, new PageResponse.Meta(
                postsPage.getTotalElements(), page, limit, postsPage.getTotalPages()));
    }
}
