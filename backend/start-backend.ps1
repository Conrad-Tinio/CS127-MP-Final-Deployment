# PowerShell script to start Spring Boot backend with IPv6 support
Write-Host "Starting Spring Boot backend..." -ForegroundColor Green
Write-Host ""
Write-Host "Note: This will attempt to connect to Supabase PostgreSQL database using IPv6." -ForegroundColor Yellow
Write-Host "If you see connection errors, please verify:" -ForegroundColor Yellow
Write-Host "  1. Your internet connection is active" -ForegroundColor Yellow
Write-Host "  2. Your Supabase project is active (not paused)" -ForegroundColor Yellow
Write-Host "  3. Your network supports IPv6" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting application..." -ForegroundColor Green
Write-Host ""

# Set Java system properties to enable IPv6 and disable DNS cache
# java.net.preferIPv4Stack=false allows IPv6 (default behavior)
# java.net.preferIPv6Addresses=true prefers IPv6 when both are available
$env:MAVEN_OPTS = "-Djava.net.preferIPv4Stack=false -Djava.net.preferIPv6Addresses=true -Dnetworkaddress.cache.ttl=0 -Dnetworkaddress.cache.negative.ttl=0"

# Run Maven wrapper
.\mvnw.cmd spring-boot:run

