package com.loantracking.util;

import com.loantracking.config.UserConfig;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class UserContext {
    
    private static final String HEADER_USER_NAME = "X-Selected-User-Name";
    private static final String HEADER_USER_ID = "X-Selected-User-Id";
    
    /**
     * Gets the current user name from the request header.
     * Falls back to the default parent user name if not found.
     */
    public static String getCurrentUserName() {
        HttpServletRequest request = getCurrentRequest();
        if (request != null) {
            String userName = request.getHeader(HEADER_USER_NAME);
            if (userName != null && !userName.trim().isEmpty()) {
                return userName.trim();
            }
        }
        return UserConfig.PARENT_USER_NAME;
    }
    
    /**
     * Gets the current user ID from the request header.
     * Returns null if not found.
     */
    public static String getCurrentUserId() {
        HttpServletRequest request = getCurrentRequest();
        if (request != null) {
            String userId = request.getHeader(HEADER_USER_ID);
            if (userId != null && !userId.trim().isEmpty()) {
                return userId.trim();
            }
        }
        return null;
    }
    
    private static HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            return attributes.getRequest();
        }
        return null;
    }
}
