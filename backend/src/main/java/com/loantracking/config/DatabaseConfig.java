package com.loantracking.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationStartingEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseConfig.class);
    
    @Value("${spring.datasource.url:}")
    private String datasourceUrl;
    
    @Value("${spring.datasource.username:}")
    private String datasourceUsername;
    
    @Value("${DATABASE_URL:}")
    private String databaseUrlEnv;
    
    @Value("${DATABASE_USERNAME:}")
    private String databaseUsernameEnv;
    
    @EventListener(ApplicationStartingEvent.class)
    public void logDatabaseConfig() {
        System.out.println("=== Database Configuration ===");
        System.out.println("DATABASE_URL env var: " + (databaseUrlEnv.isEmpty() ? "NOT SET" : "SET"));
        System.out.println("DATABASE_USERNAME env var: " + (databaseUsernameEnv.isEmpty() ? "NOT SET" : "SET"));
        System.out.println("DATABASE_PASSWORD env var: " + (System.getenv("DATABASE_PASSWORD") == null ? "NOT SET" : "SET"));
        System.out.println("Spring datasource URL: " + maskPassword(datasourceUrl));
        System.out.println("Spring datasource username: " + datasourceUsername);
        System.out.println("==============================");
        logger.info("=== Database Configuration ===");
        logger.info("DATABASE_URL env var: {}", databaseUrlEnv.isEmpty() ? "NOT SET" : "SET");
        logger.info("DATABASE_USERNAME env var: {}", databaseUsernameEnv.isEmpty() ? "NOT SET" : "SET");
        logger.info("DATABASE_PASSWORD env var: {}", System.getenv("DATABASE_PASSWORD") == null ? "NOT SET" : "SET");
        logger.info("Spring datasource URL: {}", maskPassword(datasourceUrl));
        logger.info("Spring datasource username: {}", datasourceUsername);
        logger.info("==============================");
    }
    
    private String maskPassword(String url) {
        if (url == null || url.isEmpty()) {
            return "NOT SET";
        }
        // Mask password in connection string if present
        return url.replaceAll("password=[^&;]*", "password=***");
    }
}

