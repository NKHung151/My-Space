package com.myspace.myspace.controller;

import com.myspace.myspace.dto.response.PostResponse;
import com.myspace.myspace.common.dto.ApiResponse;
import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.response.FriendRequestResponse;
import com.myspace.myspace.dto.response.FriendshipStatusResponse;
import com.myspace.myspace.dto.response.PublicUserResponse;
import com.myspace.myspace.security.custom.CustomUserDetails;
import com.myspace.myspace.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @PostMapping("/requests/{userId}")
    public ResponseEntity<ApiResponse<Void>> sendRequest(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        friendService.sendRequest(userDetails.getUser().getId(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/requests/{userId}/accept")
    public ResponseEntity<ApiResponse<Void>> acceptRequest(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        friendService.acceptRequest(userDetails.getUser().getId(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/requests/{userId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        friendService.rejectRequest(userDetails.getUser().getId(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeFriend(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        friendService.removeFriend(userDetails.getUser().getId(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PublicUserResponse>>> getFriends(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<PublicUserResponse> friends = friendService.getFriends(userDetails.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(friends));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<FriendRequestResponse>>> getPendingRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<FriendRequestResponse> requests = friendService.getPendingRequests(userDetails.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> getFeed(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        PageResponse<PostResponse> feed = friendService.getFriendsFeed(userDetails.getUser().getId(), page, limit);
        return ResponseEntity.ok(ApiResponse.success(feed));
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<ApiResponse<FriendshipStatusResponse>> getFriendshipStatus(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        FriendshipStatusResponse status = friendService.getFriendshipStatus(userDetails.getUser().getId(), userId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }
}
