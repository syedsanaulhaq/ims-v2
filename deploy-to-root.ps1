# ====================================================================
# Deploy IMS to Apache Root (C:\xampp\htdocs)
# ====================================================================
# Run this script from C:\ims-v1 directory on the server
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMS Root Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Must run from C:\ims-v1 directory!" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Server configuration
$SERVER_IP = "172.20.150.34"
$PROJECT_PATH = "C:\ims-v1"
$HTDOCS_PATH = "C:\xampp\htdocs"
$APACHE_CONF = "C:\xampp\apache\conf\extra\httpd-vhosts.conf"

Write-Host "Step 1: Pull latest code from GitHub..." -ForegroundColor Yellow
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Git pull failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Install dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Build production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Backup current htdocs (if exists)..." -ForegroundColor Yellow
if (Test-Path "$HTDOCS_PATH\index.html") {
    $backupFolder = "$HTDOCS_PATH\.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "Creating backup: $backupFolder" -ForegroundColor Gray
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
    Get-ChildItem -Path $HTDOCS_PATH -Exclude ".backup-*" | Copy-Item -Destination $backupFolder -Recurse -Force
    Write-Host "Backup created successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 5: Clear htdocs directory..." -ForegroundColor Yellow
Get-ChildItem -Path $HTDOCS_PATH -Exclude ".backup-*" | Remove-Item -Recurse -Force
Write-Host "htdocs cleared" -ForegroundColor Green

Write-Host ""
Write-Host "Step 6: Copy dist contents to htdocs..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination $HTDOCS_PATH -Recurse -Force
Write-Host "Files copied successfully" -ForegroundColor Green

Write-Host ""
Write-Host "Step 7: Create .htaccess for SPA routing..." -ForegroundColor Yellow
$htaccessContent = @"
# Simple .htaccess for SPA routing only
# Proxy configuration must be in httpd.conf or httpd-vhosts.conf

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Don't rewrite files or directories
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # Route everything to index.html for SPA
    RewriteRule ^ index.html [L]
</IfModule>
"@

Set-Content -Path "$HTDOCS_PATH\.htaccess" -Value $htaccessContent -Encoding UTF8
Write-Host ".htaccess created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 8: Start backend server (if not running)..." -ForegroundColor Yellow
$backendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*backend-server*" }
if ($backendProcess) {
    Write-Host "Backend server already running (PID: $($backendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "Starting backend server..." -ForegroundColor Gray
    Start-Process -FilePath "node" -ArgumentList "backend-server.cjs" -WindowStyle Minimized -WorkingDirectory $PROJECT_PATH
    Start-Sleep -Seconds 2
    Write-Host "Backend server started" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 9: Restart Apache..." -ForegroundColor Yellow
$apacheService = Get-Service -Name "Apache*" -ErrorAction SilentlyContinue
if ($apacheService) {
    Restart-Service -Name $apacheService.Name -Force
    Write-Host "Apache restarted successfully" -ForegroundColor Green
} else {
    Write-Host "Warning: Apache service not found. Please restart manually:" -ForegroundColor Yellow
    Write-Host "  C:\xampp\apache_stop.bat" -ForegroundColor Gray
    Write-Host "  C:\xampp\apache_start.bat" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application URL: http://$SERVER_IP/" -ForegroundColor Cyan
Write-Host "API Backend:     http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test in browser: http://$SERVER_IP/" -ForegroundColor Yellow
Write-Host ""
