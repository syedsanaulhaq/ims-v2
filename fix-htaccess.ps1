# Fix .htaccess Proxy Rule
Write-Host "`n[FIX] Fixing .htaccess proxy rule..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$htaccessPath = "C:\xampp\htdocs\ims\.htaccess"

if (Test-Path $htaccessPath) {
    Write-Host "`n[BACKUP] Creating backup..." -ForegroundColor Yellow
    $backupPath = "C:\xampp\htdocs\ims\.htaccess.backup-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    Copy-Item $htaccessPath $backupPath
    Write-Host "  [OK] Backup created: $backupPath" -ForegroundColor Green
    
    Write-Host "`n[CHECK] Current .htaccess content:" -ForegroundColor Yellow
    Get-Content $htaccessPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    Write-Host "`n[FIX] Writing corrected .htaccess..." -ForegroundColor Yellow
    
    $newContent = @"
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /ims/

  # Proxy API requests to backend Node.js server
  RewriteRule ^api/(.*)$ http://localhost:3001/api/`$1 [P,L]

  # React Router - send all non-file requests to index.html
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /ims/index.html [L]
</IfModule>
"@
    
    Set-Content -Path $htaccessPath -Value $newContent -Encoding UTF8
    Write-Host "  [OK] .htaccess updated" -ForegroundColor Green
    
    Write-Host "`n[VERIFY] New .htaccess content:" -ForegroundColor Yellow
    Get-Content $htaccessPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    Write-Host "`n[TEST] Testing proxy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/ims/api/session" -UseBasicParsing -ErrorAction Stop
        Write-Host "  [OK] Proxy working! Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Proxy still not working: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  [INFO] You may need to restart Apache manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] .htaccess not found at $htaccessPath" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "[INFO] If proxy still not working, restart Apache:" -ForegroundColor Cyan
Write-Host "  .\restart-apache.ps1" -ForegroundColor Gray
Write-Host ""
