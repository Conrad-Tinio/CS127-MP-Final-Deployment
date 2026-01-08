@echo off
echo Starting Spring Boot backend...
echo.
echo Note: This will attempt to connect to Supabase PostgreSQL database.
echo If you see connection errors, please verify:
echo 1. Your internet connection is active
echo 2. Your Supabase project is active (not paused)
echo 3. The connection string in application.properties is correct
echo.
echo Starting application...
echo.

REM Force Java to prefer IPv4 and set DNS cache TTL
set JAVA_OPTS=-Djava.net.preferIPv4Stack=true -Dnetworkaddress.cache.ttl=0 -Dnetworkaddress.cache.negative.ttl=0

call mvnw.cmd spring-boot:run %*






