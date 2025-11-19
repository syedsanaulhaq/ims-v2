# ====================================================================
# Create Apache Proxy Configuration File
# ====================================================================
# Creates a separate proxy config file that httpd.conf will include
# ====================================================================

Write-Host "Creating Apache proxy configuration..." -ForegroundColor Cyan
Write-Host ""

$proxyConfPath = "C:\xampp\apache\conf\extra\httpd-proxy-ims.conf"
$httpdConfPath = "C:\xampp\apache\conf\httpd.conf"

# Create the proxy configuration file
$proxyConfig = @"
# ====================================================================
# IMS API Proxy Configuration
# Created by create-proxy-config.ps1
# ====================================================================

# Load required proxy modules
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so

# Proxy configuration for IMS API
ProxyPreserveHost On
ProxyPass /api http://localhost:3001/api
ProxyPassReverse /api http://localhost:3001/api

# Allow proxy connections
<Proxy *>
    Order deny,allow
    Allow from all
</Proxy>
"@

Write-Host "Writing proxy config to: $proxyConfPath" -ForegroundColor Yellow
Set-Content -Path $proxyConfPath -Value $proxyConfig -Encoding UTF8
Write-Host "Proxy config file created!" -ForegroundColor Green
Write-Host ""

# Check if httpd.conf includes this file
$httpdContent = Get-Content $httpdConfPath -Raw

if ($httpdContent -match "httpd-proxy-ims.conf") {
    Write-Host "httpd.conf already includes proxy config" -ForegroundColor Green
} else {
    Write-Host "Adding include directive to httpd.conf..." -ForegroundColor Yellow
    
    # Backup httpd.conf
    $backupPath = "$httpdConfPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $httpdConfPath $backupPath
    Write-Host "Backup created: $backupPath" -ForegroundColor Gray
    
    # Add include at the end
    $includeDirective = "`r`n# Include IMS proxy configuration`r`nInclude conf/extra/httpd-proxy-ims.conf`r`n"
    Add-Content -Path $httpdConfPath -Value $includeDirective -Encoding UTF8
    
    Write-Host "Include directive added to httpd.conf" -ForegroundColor Green
}

Write-Host ""
Write-Host "Configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Restart Apache" -ForegroundColor Yellow
Write-Host "  C:\xampp\apache_stop.bat" -ForegroundColor Gray
Write-Host "  C:\xampp\apache_start.bat" -ForegroundColor Gray
Write-Host ""

$restart = Read-Host "Restart Apache now? (Y/N)"
if ($restart -eq "Y" -or $restart -eq "y") {
    Write-Host ""
    Write-Host "Restarting Apache..." -ForegroundColor Yellow
    
    $apacheService = Get-Service -Name "Apache*" -ErrorAction SilentlyContinue
    if ($apacheService) {
        Restart-Service -Name $apacheService.Name -Force
        Write-Host "Apache restarted!" -ForegroundColor Green
    } else {
        Write-Host "Running batch files..." -ForegroundColor Gray
        Start-Process "C:\xampp\apache_stop.bat" -Wait -NoNewWindow
        Start-Sleep -Seconds 2
        Start-Process "C:\xampp\apache_start.bat" -Wait -NoNewWindow
        Write-Host "Apache restarted!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Test: http://172.20.150.34/" -ForegroundColor Cyan
Write-Host ""
