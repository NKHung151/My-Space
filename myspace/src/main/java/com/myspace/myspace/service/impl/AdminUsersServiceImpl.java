package com.myspace.myspace.service.impl;

import com.myspace.myspace.common.dto.PageResponse;
import com.myspace.myspace.dto.request.UpdateAdminUserRequest;
import com.myspace.myspace.dto.response.AdminUserResponse;
import com.myspace.myspace.entity.Role;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.RoleRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.service.AdminUsersService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUsersServiceImpl implements AdminUsersService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> getUsers(String search, String role, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        // Treat empty strings as null for JPQL query
        String searchParam = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;
        String roleParam = (role != null && !role.trim().isEmpty()) ? role.trim() : null;
        String statusParam = (status != null && !status.trim().isEmpty()) ? status.trim() : null;
        
        Page<User> usersPage = userRepository.searchAdminUsers(searchParam, roleParam, statusParam, pageable);
        
        List<AdminUserResponse> content = usersPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
                
        return new PageResponse<>(content, new PageResponse.Meta(
                usersPage.getTotalElements(),
                page,
                limit,
                usersPage.getTotalPages()
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public AdminUserResponse updateUser(Long id, UpdateAdminUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            user.setStatus(request.getStatus().trim());
        }
        
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            Role newRole = roleRepository.findByName(request.getRole().trim())
                    .orElseThrow(() -> new RuntimeException("Role not found"));
            user.setRole(newRole);
        }
        
        User updated = userRepository.save(user);
        return mapToResponse(updated);
    }
    
    private AdminUserResponse mapToResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
