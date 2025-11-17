# Enable Apache Proxy Modules for XAMPP
$httpdConf = "C:\xampp\apache\conf\httpd.conf"

Write-Host "Enabling Apache proxy modules..." -ForegroundColor Yellow

# Backup original file
Copy-Item $httpdConf "$httpdConf.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Read file
$content = Get-Content $httpdConf

# Enable modules
$content = $content -replace '#LoadModule proxy_module', 'LoadModule proxy_module'
$content = $content -replace '#LoadModule proxy_http_module', 'LoadModule proxy_http_module'

# Write back
$content | Set-Content $httpdConf

Write-Host "✅ Proxy modules enabled!" -ForegroundColor Green
Write-Host "Please restart Apache from XAMPP Control Panel" -ForegroundColor Yellow
