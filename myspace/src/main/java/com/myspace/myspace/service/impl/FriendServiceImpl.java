package com.myspace.myspace.service.impl;

import org.springframework.http.HttpStatus;
import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.common.util.Paging;
import com.myspace.myspace.mapper.UserMapper;
import com.myspace.myspace.mapper.FriendMapper;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.common.util.AfterCommit;
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
import org.springframework.data.domain.Pageable;
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
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể gửi lời mời kết bạn cho chính mình.");
        }
        if (friendshipRepository.existsByUserIdAndFriendId(currentUserId, targetUserId)) {
            throw new AppException(HttpStatus.CONFLICT, "Hai người đã là bạn bè.");
        }
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(currentUserId, targetUserId, "pending")) {
            throw new AppException(HttpStatus.CONFLICT, "Bạn đã gửi lời mời kết bạn rồi.");
        }
        // Auto-accept if reverse pending request exists
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(targetUserId, currentUserId, "pending")) {
            acceptRequest(currentUserId, targetUserId);
            return;
        }

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        User receiver = userRepository.findById(targetUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        // Bảng có unique (sender_id, receiver_id): nếu lời mời cũ đã bị từ chối thì dùng lại bản ghi đó,
        // insert thêm bản ghi mới sẽ vi phạm unique (trước đây trả lỗi 500)
        FriendRequest request = friendRequestRepository.findBySenderIdAndReceiverId(currentUserId, targetUserId)
                .orElseGet(FriendRequest::new);
        request.setSender(sender);
        request.setReceiver(receiver);
        request.setStatus("pending");
        friendRequestRepository.save(request);

        // Push real-time notification to the receiver (dùng email = principal name của WebSocket)
        FriendRequestResponse response = FriendMapper.toRequestResponse(request);
        log.info("[WS] Sending friend-request notification to user: {}", receiver.getEmail());
        notifyAfterCommit(
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
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy lời mời kết bạn."));

        request.setStatus("accepted");
        friendRequestRepository.save(request);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        User senderUser = userRepository.findById(senderId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

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
        PublicUserResponse currentUserResponse = UserMapper.toPublicUser(currentUser);
        notifyAfterCommit(
                senderUser.getEmail(),
                "/queue/friend-accept",
                currentUserResponse
        );

        // Thông báo cho người CHẤP NHẬN (currentUser): thêm senderUser vào danh sách bạn
        PublicUserResponse senderResponse = UserMapper.toPublicUser(senderUser);
        notifyAfterCommit(
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
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy lời mời kết bạn."));
        request.setStatus("rejected");
        friendRequestRepository.save(request);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        // Báo cho người từ chối (currentUser) biết để ẩn lời mời khỏi giao diện
        notifyAfterCommit(
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
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        User friendUser = userRepository.findById(friendId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        // Báo cho người bị xóa (friendUser) biết rằng currentUserId đã không còn là bạn
        notifyAfterCommit(
                friendUser.getEmail(),
                "/queue/friend-remove",
                currentUserId
        );

        // Báo cho người chủ động xóa (currentUser) biết để tự xóa friendId khỏi danh sách
        notifyAfterCommit(
                currentUser.getEmail(),
                "/queue/friend-remove",
                friendId
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicUserResponse> getFriends(Long userId) {
        return friendshipRepository.findFriendsByUserId(userId).stream()
                .map(UserMapper::toPublicUser)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FriendRequestResponse> getPendingRequests(Long currentUserId) {
        return friendRequestRepository.findByReceiverIdAndStatus(currentUserId, "pending").stream()
                .map(FriendMapper::toRequestResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FriendshipStatusResponse getFriendshipStatus(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) return new FriendshipStatusResponse("none");
        if (friendshipRepository.existsByUserIdAndFriendId(currentUserId, targetUserId)) return new FriendshipStatusResponse("friends");
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(currentUserId, targetUserId, "pending")) return new FriendshipStatusResponse("pending_sent");
        if (friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(targetUserId, currentUserId, "pending")) return new FriendshipStatusResponse("pending_received");
        return new FriendshipStatusResponse("none");
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getFriendsFeed(Long currentUserId, int page, int limit) {
        Pageable pageable = Paging.newestFirst(page, limit);
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

        return PageResponse.of(postsPage, items);
    }

    private void notifyAfterCommit(String userEmail, String destination, Object payload) {
        AfterCommit.run(() -> messagingTemplate.convertAndSendToUser(userEmail, destination, payload));
    }
}
