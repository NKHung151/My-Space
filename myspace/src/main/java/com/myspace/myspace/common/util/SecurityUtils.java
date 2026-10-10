package com.myspace.myspace.common.util;

import com.myspace.myspace.security.custom.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    // Id người dùng đang đăng nhập, hoặc null nếu là khách.
    public static Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails details) {
            return details.getUser().getId();
        }
        return null;
    }
}
