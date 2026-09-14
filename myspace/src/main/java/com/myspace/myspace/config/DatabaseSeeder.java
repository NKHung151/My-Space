package com.myspace.myspace.config;

import com.myspace.myspace.entity.Role;
import com.myspace.myspace.entity.User;
import com.myspace.myspace.repository.RoleRepository;
import com.myspace.myspace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Chỉ insert nếu database chưa có user nào
        if (userRepository.count() == 0) {
            
            // 1. Tạo Roles trước
            Role adminRole = roleRepository.findByName("admin").orElseGet(() -> {
                Role r = new Role();
                r.setName("admin");
                return roleRepository.save(r);
            });
            
            Role userRole = roleRepository.findByName("user").orElseGet(() -> {
                Role r = new Role();
                r.setName("user");
                return roleRepository.save(r);
            });

            String encodedPassword = passwordEncoder.encode("12345678");

            User user1 = new User();
            user1.setEmail("admin@gmail.com");
            user1.setUsername("admin");
            user1.setPassword(encodedPassword);
            user1.setFullName("Quản trị viên");
            user1.setDisplayName("Admin");
            user1.setStatus("ACTIVE");
            user1.setRole(adminRole); // Gán Role thật sự
            userRepository.save(user1);

            User user2 = new User();
            user2.setEmail("user@gmail.com");
            user2.setUsername("user");
            user2.setPassword(encodedPassword);
            user2.setFullName("Người dùng test");
            user2.setDisplayName("Test User");
            user2.setStatus("ACTIVE");
            user2.setRole(userRole); // Gán Role thật sự
            userRepository.save(user2);

            System.out.println("=========================================");
            System.out.println("Đã tự động tạo 2 tài khoản mẫu:");
            System.out.println("1. admin@gmail.com / 12345678 (Quyền: admin)");
            System.out.println("2. user@gmail.com / 12345678 (Quyền: user)");
            System.out.println("=========================================");
        }
    }
}
