package com.myspace.myspace.security.jwt;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

    // Lấy khóa bí mật từ application.properties
    @Value("${jwt.secret}")
    private String jwtSecret;

    // Lấy thời gian sống của Access Token (15 phút)
    @Value("${jwt.access-token.expiration}")
    private Long jwtAccessTokenExpiration;

    // Lấy thời gian sống của Refresh Token (1 ngày)
    @Value("${jwt.refresh-token.expiration}")
    private Long jwtRefreshTokenExpiration;

    /**
     * 1. TẠO ACCESS TOKEN (Thẻ chính)
     * Hàm này được gọi khi User đăng nhập thành công.
     */
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        // Truyền thời gian sống của Access Token vào
        return createToken(claims, userDetails.getUsername(), jwtAccessTokenExpiration);
    }


    /**
     * 3. LÕI TẠO TOKEN
     * Nhận vào thông tin (claims), Tên đăng nhập (subject) và Thời gian sống
     * (expiration).
     * Dùng thuật toán HS256 và khóa bí mật để ký tên đóng dấu (signWith).
     */
    private String createToken(Map<String, Object> claims, String subject, long expirationTime) {
        return Jwts.builder()
                .setClaims(claims) // Chứa dữ liệu phụ (Role...)
                .setSubject(subject) // Lưu Tên đăng nhập (Email)
                .setIssuedAt(new Date(System.currentTimeMillis())) // Thời gian phát hành thẻ
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime)) // Thời gian hết hạn
                .signWith(getSigningKey(), SignatureAlgorithm.HS256) // Đóng dấu bảo mật
                .compact(); // Nén lại thành chuỗi String
    }

    /**
     * 4. LẤY KHÓA KÝ
     * Biến chuỗi bí mật (jwtSecret) thành một chiếc chìa khóa hợp lệ của thuật toán
     * HMAC-SHA.
     */
    private Key getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * 5. TRÍCH XUẤT USERNAME (Đọc thẻ)
     * Rút ra Tên đăng nhập (subject) đang được giấu bên trong Token.
     */
    public String extractUsername(String token) {
        return extractClaims(token, Claims::getSubject);
    }

    /**
     * 6. SOI THẺ (KIỂM TRA HỢP LỆ)
     * Trạm gác sẽ gọi hàm này. Token hợp lệ khi:
     * - Username rạch ra từ Token phải khớp với Username trong Database.
     * - Token chưa bị hết hạn thời gian.
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    private Boolean isTokenExpired(String token) {
        Date expiration = extractClaims(token, Claims::getExpiration);
        return expiration.before(new Date());
    }

    public <T> T extractClaims(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Mở Token.
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
