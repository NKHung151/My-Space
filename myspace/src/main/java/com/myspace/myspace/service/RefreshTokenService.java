package com.myspace.myspace.service;

import com.myspace.myspace.entity.RefreshToken;
import java.util.Optional;

public interface RefreshTokenService {
    RefreshToken createRefreshToken(Long userId);
    Optional<RefreshToken> findByToken(String token);
    RefreshToken verifyExpiration(RefreshToken refreshToken);
    void revokeAllUserTokens(Long userId);
}
