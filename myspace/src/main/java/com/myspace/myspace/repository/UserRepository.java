package com.myspace.myspace.repository;

import com.myspace.myspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
