# Complete Deployment Guide - Loan Tracking System

> **Deployment Stack**: Render (Backend) + Netlify (Frontend) + Supabase (Database)

This comprehensive guide documents the complete setup and deployment process for the Loan Tracking System.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [File Changes Required](#file-changes-required)
5. [Backend Deployment (Render)](#backend-deployment-render)
6. [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Troubleshooting](#troubleshooting)
10. [Local Development](#local-development)

---

## Architecture Overview

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│      Netlify        │      │       Render        │      │      Supabase       │
│    (Frontend)       │ ───► │   (Spring Boot)     │ ───► │    PostgreSQL       │
│    React/Vite       │ API  │      Backend        │ JDBC │     Database        │
│                     │      │                     │      │                     │
│ ofw-loan-tracking-  │      │ cs127-mp-deployment │      │ aws-1-ap-southeast  │
│ system.netlify.app  │      │ .onrender.com       │      │ -2.pooler.supabase  │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

### Tech Stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | Netlify |
| Backend | Spring Boot 3.2.0 + Java 21 | Render |
| Database | PostgreSQL | Supabase |

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account** - Code must be in a GitHub repository
2. **Render Account** - Free at [render.com](https://render.com)
3. **Netlify Account** - Free at [netlify.com](https://netlify.com)
4. **Supabase Project** - Your database (already configured)

### Your Supabase Credentials (Example)

```
Host: aws-1-ap-southeast-2.pooler.supabase.com
Port: 5432
Database: postgres
Username: postgres.pkmcmbnrxioxwtprlgyk
Password: (your password)
```

---

## Project Structure

```
CS127-MP-Deployment/
├── backend/
│   ├── src/main/
│   │   ├── java/com/loantracking/
│   │   │   ├── config/
│   │   │   │   ├── CorsConfig.java          ← Modified for CORS
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   ├── controller/
│   │   │   ├── dto/
│   │   │   ├── model/
│   │   │   ├── repository/
│   │   │   ├── service/
│   │   │   └── LoanTrackingApplication.java
│   │   └── resources/
│   │       └── application.properties       ← Modified for env vars
│   ├── Dockerfile                           ← Created for Render
│   ├── .dockerignore                        ← Created
│   ├── system.properties                    ← Created for Java version
│   ├── mvnw                                 ← Created (Unix script)
│   ├── mvnw.cmd
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx                   ← Fixed unused imports
│   │   ├── pages/
│   │   │   ├── AllPaymentsPage.tsx          ← Fixed unused imports
│   │   │   ├── CreateEntryPage.tsx          ← Fixed TypeScript errors
│   │   │   ├── EntryDetailPage.tsx          ← Fixed unused imports
│   │   │   ├── HomePage.tsx
│   │   │   └── PeopleGroupsPage.tsx         ← Fixed unused imports
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── netlify.toml                         ← Created for Netlify
│   ├── vercel.json
│   ├── package.json
│   └── vite.config.ts
├── database/
├── render.yaml                              ← Created for Render blueprint
├── DEPLOYMENT.md
└── .gitignore                               ← Modified
```

---

## File Changes Required

### 1. Backend: `application.properties`

**File:** `backend/src/main/resources/application.properties`

```properties
# Application Configuration
spring.application.name=loan-tracking-system
server.port=${PORT:8080}

# Database Configuration (Supabase PostgreSQL)
# These values are loaded from environment variables in production
spring.datasource.url=${DATABASE_URL:jdbc:postgresql://localhost:5432/loantracking}
spring.datasource.username=${DATABASE_USERNAME:postgres}
spring.datasource.password=${DATABASE_PASSWORD:password}
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=${SHOW_SQL:false}
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true
# Use bytea for byte[] instead of OID
spring.jpa.properties.hibernate.type.preferred_blob_type=MATERIALIZED_BLOB

# Connection pool settings - optimized for cloud deployment
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.initialization-fail-timeout=-1
spring.datasource.hikari.maximum-pool-size=${HIKARI_MAX_POOL_SIZE:5}
spring.datasource.hikari.minimum-idle=${HIKARI_MIN_IDLE:1}

# Lazy database initialization (connect only when needed)
spring.jpa.properties.hibernate.temp.use_jdbc_metadata_defaults=false

# CORS Configuration - Frontend URL (set via environment variable in production)
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:3000}

# Logging Configuration
logging.level.org.springframework.web=${LOG_LEVEL_SPRING:INFO}
logging.level.org.hibernate.SQL=${LOG_LEVEL_HIBERNATE:INFO}
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=INFO
```

---

### 2. Backend: `CorsConfig.java`

**File:** `backend/src/main/java/com/loantracking/config/CorsConfig.java`

```java
package com.loantracking.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow frontend origins from environment variable (comma-separated)
        String[] origins = allowedOrigins.split(",");
        for (String origin : origins) {
            config.addAllowedOrigin(origin.trim());
        }
        
        // Allow all HTTP methods
        config.addAllowedMethod("*");
        
        // Allow all headers
        config.addAllowedHeader("*");
        
        // Allow credentials
        config.setAllowCredentials(true);
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```

---

### 3. Backend: `Dockerfile`

**File:** `backend/Dockerfile`

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x mvnw

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the application
RUN ./mvnw package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
USER appuser

# Copy the built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port (Render will set PORT env variable)
EXPOSE 8080

# JVM options optimized for containers with limited memory
ENV JAVA_OPTS="-Xmx256m -Xms128m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

---

### 4. Backend: `.dockerignore`

**File:** `backend/.dockerignore`

```
# Git
.git
.gitignore

# IDE
.idea
*.iml
.vscode

# Build artifacts (we rebuild in container)
target/

# Environment files
.env
*.env.local

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db
```

---

### 5. Backend: `system.properties`

**File:** `backend/system.properties`

```
java.runtime.version=21
```

---

### 6. Backend: `mvnw` (Unix Maven Wrapper)

**File:** `backend/mvnw`

> ⚠️ **Important:** This file must exist for Docker builds on Render. If missing, create it by running:
> ```bash
> cd backend
> mvn wrapper:wrapper
> ```
> Or copy from a working Spring Boot project.

The file should be a shell script starting with `#!/bin/sh`.

---

### 7. Frontend: `netlify.toml`

**File:** `frontend/netlify.toml`

```toml
# Netlify Configuration for Loan Tracking System Frontend

[build]
  # Base directory (where package.json is)
  base = "frontend"
  
  # Build command
  command = "npm run build"
  
  # Publish directory (relative to base)
  publish = "dist"

# Handle SPA routing - redirect all routes to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### 8. Frontend: TypeScript Fixes

Several files needed TypeScript fixes for unused imports and type issues:

#### `frontend/src/components/Layout.tsx`
Remove unused `TrendingUp` import from lucide-react.

#### `frontend/src/pages/AllPaymentsPage.tsx`
Remove unused `Filter`, `ArrowUpDown` imports from lucide-react.

#### `frontend/src/pages/CreateEntryPage.tsx`
**Critical fixes:**
1. Remove `useEffect` import (unused)
2. Remove `loading`, `setLoading` state (unused)
3. Change `TransactionType` enum usage to string literal union type:

```typescript
// Change the interface
interface FormData {
  // ...
  transactionType: 'STRAIGHT_EXPENSE' | 'INSTALLMENT_EXPENSE' | 'GROUP_EXPENSE'
  // ...
}

// Change the function signature
const getTransactionTypeDescription = (type: 'STRAIGHT_EXPENSE' | 'INSTALLMENT_EXPENSE' | 'GROUP_EXPENSE') => {
  // ...
}

// Remove redundant required check (line ~311)
// Change from:
required={formData.transactionType !== 'GROUP_EXPENSE'}
// To:
required
```

#### `frontend/src/pages/EntryDetailPage.tsx`
Remove unused `FileText` import from lucide-react.

#### `frontend/src/pages/PeopleGroupsPage.tsx`
Remove unused `ChevronRight` import from lucide-react.

---

### 9. Root: `render.yaml` (Optional Blueprint)

**File:** `render.yaml`

```yaml
# Render Blueprint - Infrastructure as Code
services:
  - type: web
    name: loan-tracking-api
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    region: singapore
    plan: free
    healthCheckPath: /api/persons
    envVars:
      - key: PORT
        value: 8080
      - key: DATABASE_URL
        sync: false
      - key: DATABASE_USERNAME
        sync: false
      - key: DATABASE_PASSWORD
        sync: false
      - key: CORS_ALLOWED_ORIGINS
        sync: false
      - key: SHOW_SQL
        value: "false"
      - key: HIKARI_MAX_POOL_SIZE
        value: "3"
      - key: HIKARI_MIN_IDLE
        value: "1"
```

---

### 10. Root: `.gitignore`

**File:** `.gitignore`

```gitignore
# Environment files with sensitive data
.env
.env.local
.env.*.local
*.env

# But keep the example files
!env.example
!*.example

# IDE
.idea/
.vscode/
*.iml
*.swp
*.swo
*~

# Maven
backend/target/

# Node
frontend/node_modules/
frontend/dist/
frontend/.vite/

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
desktop.ini

# Build
*.class
*.jar
!backend/.mvn/wrapper/*.jar

# Temporary files
*.tmp
*.temp
.cache/
```

---

## Backend Deployment (Render)

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Configure for Render and Netlify deployment"
git push origin main
```

### Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository

### Step 3: Configure Build Settings

| Setting | Value |
|---------|-------|
| **Name** | `cs127-mp-deployment` (or your choice) |
| **Region** | `Singapore` (closest to Supabase) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` |

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DATABASE_USERNAME` | `postgres.pkmcmbnrxioxwtprlgyk` |
| `DATABASE_PASSWORD` | `cs127loan!!` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` *(update after frontend deployment)* |
| `SHOW_SQL` | `false` |
| `HIKARI_MAX_POOL_SIZE` | `3` |
| `HIKARI_MIN_IDLE` | `1` |

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for build (~5-10 minutes for first build)
3. Note your URL: `https://cs127-mp-deployment.onrender.com`

---

## Frontend Deployment (Netlify)

### Step 1: Create Netlify Site

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **"Deploy with GitHub"**
4. Choose your repository

### Step 2: Configure Build Settings

| Setting | Value |
|---------|-------|
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/dist` |

### Step 3: Add Environment Variable

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://cs127-mp-deployment.onrender.com/api` |

### Step 4: Deploy

1. Click **"Deploy site"**
2. Wait for build (~1-2 minutes)
3. Note your URL: `https://ofw-loan-tracking-system.netlify.app`

---

## Post-Deployment Configuration

### Update CORS on Render

After Netlify deployment, update the backend CORS settings:

1. Go to **Render Dashboard** → Your service → **Environment**
2. Update `CORS_ALLOWED_ORIGINS`:
   ```
   https://ofw-loan-tracking-system.netlify.app,http://localhost:5173
   ```
3. Click **"Save Changes"** → Render auto-redeploys

---

## Environment Variables Reference

### Backend (Render)

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `PORT` | Server port (auto-set by Render) | `8080` |
| `DATABASE_URL` | Supabase JDBC connection string | `jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DATABASE_USERNAME` | Supabase database username | `postgres.pkmcmbnrxioxwtprlgyk` |
| `DATABASE_PASSWORD` | Supabase database password | `(your password)` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend URLs (comma-separated) | `https://your-app.netlify.app,http://localhost:5173` |
| `SHOW_SQL` | Log SQL queries | `false` |
| `HIKARI_MAX_POOL_SIZE` | Maximum database connections | `3` |
| `HIKARI_MIN_IDLE` | Minimum idle connections | `1` |

### Frontend (Netlify)

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `VITE_API_BASE_URL` | Backend API base URL | `https://your-backend.onrender.com/api` |

---

## Troubleshooting

### Backend Issues

#### "Application failed to start"
- Check Render logs for specific errors
- Verify all environment variables are set correctly
- Ensure `DATABASE_URL` has `?sslmode=require`

#### "Connection refused" / "Database connection failed"
- Verify Supabase credentials
- Check if Supabase project is active
- Ensure using the Session Pooler URL (IPv4 compatible)

#### "mvnw: not found"
- Ensure `backend/mvnw` file exists (Unix shell script)
- File should start with `#!/bin/sh`

### Frontend Issues

#### "Network Error" / "Failed to fetch"
- Verify `VITE_API_BASE_URL` is correct (include `/api`)
- Check backend is running on Render
- Check CORS settings on backend

#### "CORS error"
- Update `CORS_ALLOWED_ORIGINS` on Render to include exact frontend URL
- No trailing slashes in URL
- Redeploy backend after changing environment variable

#### TypeScript Build Errors
- Remove unused imports
- Use string literal union types instead of enums for comparisons
- See [File Changes Required](#file-changes-required) section

### Cold Start Delays

The free tier on Render spins down after 15 minutes of inactivity. First request after being idle takes **30-60 seconds**. This is normal for free tier.

---

## Local Development

### Running Backend Locally

```bash
cd backend

# Option 1: Using Maven wrapper
./mvnw spring-boot:run

# Option 2: Using installed Maven
mvn spring-boot:run
```

Backend runs at: `http://localhost:8080`

### Running Frontend Locally

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Testing Against Production Backend

```bash
cd frontend

# Create .env.local file
echo "VITE_API_BASE_URL=https://cs127-mp-deployment.onrender.com/api" > .env.local

# Start frontend
npm run dev
```

---

## Deployment URLs Summary

| Service | URL |
|---------|-----|
| **Frontend (Netlify)** | https://ofw-loan-tracking-system.netlify.app |
| **Backend (Render)** | https://cs127-mp-deployment.onrender.com |
| **Backend API** | https://cs127-mp-deployment.onrender.com/api |
| **Database (Supabase)** | aws-1-ap-southeast-2.pooler.supabase.com |

---

## Cost Summary (Free Tier)

| Service | Free Tier Limits | Monthly Cost |
|---------|------------------|--------------|
| **Netlify** | 100GB bandwidth, unlimited deploys | $0 |
| **Render** | 750 hours/month, spins down after inactivity | $0 |
| **Supabase** | 500MB database, 2GB bandwidth | $0 |

**Total: $0/month** for development and light production use.

---

## Quick Reference Commands

```bash
# Push changes to GitHub
git add .
git commit -m "Your message"
git push

# Rebuild on Render
# (Automatic when you push to GitHub)

# Manual deploy on Netlify
# Go to: Netlify Dashboard → Deploys → Trigger deploy

# Check backend health
curl https://cs127-mp-deployment.onrender.com/api/persons

# View logs on Render
# Go to: Render Dashboard → Your Service → Logs
```

---

*Last Updated: January 2026*
*Guide created during CS127 Machine Project deployment*

