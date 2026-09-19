package com.myspace.myspace.repository;

import com.myspace.myspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role.name = :role) AND " +
           "(:status IS NULL OR u.status = :status) AND " +
           "(:search IS NULL OR u.unaccentedDisplayName LIKE %:search% OR u.username LIKE %:search% OR u.email LIKE %:search%)")
    org.springframework.data.domain.Page<User> searchAdminUsers(@org.springframework.data.repository.query.Param("search") String search, @org.springframework.data.repository.query.Param("role") String role, @org.springframework.data.repository.query.Param("status") String status, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT u.role.name as role, COUNT(u) as count FROM User u GROUP BY u.role.name")
    java.util.List<Object[]> countUsersByRole();

    @org.springframework.data.jpa.repository.Query("SELECT u.status as status, COUNT(u) as count FROM User u GROUP BY u.status")
    java.util.List<Object[]> countUsersByStatus();

    @org.springframework.data.jpa.repository.Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC", nativeQuery = true)
    java.util.List<Object[]> countUsersGrowthLast7Days();
}
