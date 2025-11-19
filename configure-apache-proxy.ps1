# ====================================================================
# Configure Apache Proxy for API Backend
# ====================================================================
# Adds proxy configuration to httpd.conf
# Run as Administrator
# ====================================================================

Write-Host "Configuring Apache Proxy..." -ForegroundColor Cyan
Write-Host ""

$httpdConf = "C:\xampp\apache\conf\httpd.conf"

# Backup first
$backupPath = "$httpdConf.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $httpdConf $backupPath
Write-Host "Backup created: $backupPath" -ForegroundColor Green
Write-Host ""

# Read current config
$content = Get-Content $httpdConf -Raw

# Check if proxy config already exists
if ($content -match "ProxyPass /api") {
    Write-Host "Proxy configuration already exists in httpd.conf" -ForegroundColor Yellow
    Write-Host "Skipping modification" -ForegroundColor Gray
} else {
    Write-Host "Adding proxy configuration..." -ForegroundColor Yellow
    
    # Proxy configuration to add
    $proxyConfig = @"

# ====================================================================
# IMS API Proxy Configuration
# Added by configure-apache-proxy.ps1
# ====================================================================
<IfModule mod_proxy.c>
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
</IfModule>
"@
    
    # Append to end of file
    Add-Content -Path $httpdConf -Value $proxyConfig -Encoding UTF8
    Write-Host "Proxy configuration added successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Apache for changes to take effect" -ForegroundColor Gray
Write-Host "2. Test: http://172.20.150.34/" -ForegroundColor Gray
Write-Host ""

$restart = Read-Host "Restart Apache now? (Y/N)"
if ($restart -eq "Y" -or $restart -eq "y") {
    Write-Host ""
    Write-Host "Restarting Apache..." -ForegroundColor Yellow
    
    $apacheService = Get-Service -Name "Apache*" -ErrorAction SilentlyContinue
    if ($apacheService) {
        Restart-Service -Name $apacheService.Name -Force
        Write-Host "Apache restarted successfully!" -ForegroundColor Green
    } else {
        Write-Host "Please restart Apache manually:" -ForegroundColor Yellow
        Write-Host "  C:\xampp\apache_stop.bat" -ForegroundColor Gray
        Write-Host "  C:\xampp\apache_start.bat" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
