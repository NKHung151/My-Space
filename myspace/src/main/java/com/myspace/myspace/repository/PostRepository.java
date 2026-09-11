package com.myspace.myspace.repository;

import com.myspace.myspace.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {
}
