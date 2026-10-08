package com.myspace.myspace.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // Các endpoint dễ bị brute-force (mật khẩu, OTP) / spam email có giới hạn riêng, chặt hơn
    private static final Set<String> SENSITIVE_AUTH_PATHS = Set.of(
            "/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password");

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();

    private Bucket createNewBucket() {
        // Allow 60 requests per 1 minute per IP
        Bandwidth limit = Bandwidth.classic(60, Refill.greedy(60, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createAuthBucket() {
        // 10 lần / phút / IP cho đăng nhập, quên & đặt lại mật khẩu
        Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = getClientIP(request);
        Bucket bucket = SENSITIVE_AUTH_PATHS.contains(request.getRequestURI())
                ? authBuckets.computeIfAbsent(clientIp, k -> createAuthBucket())
                : buckets.computeIfAbsent(clientIp, k -> createNewBucket());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests");
        }
    }
    
    private String getClientIP(HttpServletRequest request) {
        // Không đọc X-Forwarded-For trực tiếp: client tự đặt header này để đổi "IP" mỗi request và né giới hạn.
        // Nếu chạy sau reverse proxy tin cậy, bật server.forward-headers-strategy=native/framework
        // để Tomcat/Spring ghi IP thật vào remoteAddr.
        return request.getRemoteAddr();
    }
}
