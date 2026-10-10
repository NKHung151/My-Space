package com.myspace.myspace.repository;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.Modifying;
import java.time.LocalDateTime;
import java.util.List;
import com.myspace.myspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @Transactional
    @Modifying
    @Query("UPDATE User u SET u.lastSeenAt = :at WHERE u.id = :id")
    void updateLastSeenAt(@Param("id") Long id,
                          @Param("at") LocalDateTime at);
    Page<User> findByIdNot(Long id, Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role.name = :role) AND " +
           "(:status IS NULL OR u.status = :status) AND " +
           "(:search IS NULL OR u.unaccentedDisplayName LIKE %:search% OR u.username LIKE %:search% OR u.email LIKE %:search%)")
    Page<User> searchAdminUsers(@Param("search") String search, @Param("role") String role, @Param("status") String status, Pageable pageable);

    @Query("SELECT u.role.name as role, COUNT(u) as count FROM User u GROUP BY u.role.name")
    List<Object[]> countUsersByRole();

    @Query("SELECT u.status as status, COUNT(u) as count FROM User u GROUP BY u.status")
    List<Object[]> countUsersByStatus();

    @Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC", nativeQuery = true)
    List<Object[]> countUsersGrowthLast7Days();
}
