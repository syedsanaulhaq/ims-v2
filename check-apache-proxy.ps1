# Check Apache Proxy Configuration
Write-Host "`n🔍 Checking Apache Proxy Configuration..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Check if .htaccess exists
$htaccessPath = "C:\xampp\htdocs\ims\.htaccess"
Write-Host "`n1. Checking .htaccess file..." -ForegroundColor Yellow
if (Test-Path $htaccessPath) {
    Write-Host "  ✅ .htaccess exists" -ForegroundColor Green
    Write-Host "`n  Content:" -ForegroundColor Cyan
    Get-Content $htaccessPath | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ❌ .htaccess NOT FOUND at $htaccessPath" -ForegroundColor Red
}

# Check httpd.conf for proxy modules
Write-Host "`n2. Checking Apache proxy modules..." -ForegroundColor Yellow
$httpdConf = "C:\xampp\apache\conf\httpd.conf"
if (Test-Path $httpdConf) {
    $content = Get-Content $httpdConf
    
    $proxyModule = $content | Select-String "LoadModule proxy_module"
    $proxyHttpModule = $content | Select-String "LoadModule proxy_http_module"
    $rewriteModule = $content | Select-String "LoadModule rewrite_module"
    
    if ($proxyModule -notmatch "^#") {
        Write-Host "  ✅ mod_proxy: ENABLED" -ForegroundColor Green
    } else {
        Write-Host "  ❌ mod_proxy: DISABLED" -ForegroundColor Red
    }
    
    if ($proxyHttpModule -notmatch "^#") {
        Write-Host "  ✅ mod_proxy_http: ENABLED" -ForegroundColor Green
    } else {
        Write-Host "  ❌ mod_proxy_http: DISABLED" -ForegroundColor Red
    }
    
    if ($rewriteModule -notmatch "^#") {
        Write-Host "  ✅ mod_rewrite: ENABLED" -ForegroundColor Green
    } else {
        Write-Host "  ❌ mod_rewrite: DISABLED" -ForegroundColor Red
    }
}

# Check if AllowOverride is set correctly
Write-Host "`n3. Checking AllowOverride settings..." -ForegroundColor Yellow
$allowOverride = $content | Select-String "AllowOverride" | Where-Object { $_ -notmatch "^#" }
if ($allowOverride) {
    $allowOverride | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠️ No AllowOverride settings found" -ForegroundColor Yellow
}

# Check if backend is running
Write-Host "`n4. Checking if backend server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/session" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend responding on port 3001" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend NOT responding on port 3001" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check Apache error log
Write-Host "`n5. Checking recent Apache errors..." -ForegroundColor Yellow
$errorLog = "C:\xampp\apache\logs\error.log"
if (Test-Path $errorLog) {
    $recentErrors = Get-Content $errorLog -Tail 20 | Where-Object { $_ -match "ims" -or $_ -match "proxy" -or $_ -match "rewrite" }
    if ($recentErrors) {
        $recentErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    } else {
        Write-Host "  No recent errors related to IMS" -ForegroundColor Green
    }
}

# Test proxy directly
Write-Host "`n6. Testing proxy path..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/ims/api/session" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Proxy working! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Proxy NOT working! Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "💡 Recommendations:" -ForegroundColor Cyan
Write-Host "  - Ensure backend is running: .\start-production.ps1" -ForegroundColor Gray
Write-Host "  - Restart Apache: C:\xampp\apache_stop.bat && C:\xampp\apache_start.bat" -ForegroundColor Gray
Write-Host "  - Check httpd.conf has 'AllowOverride All' for htdocs directory" -ForegroundColor Gray
Write-Host ""
