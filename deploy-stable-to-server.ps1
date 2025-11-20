# Deploy Stable Production Version to Server Root
# Run this script ON THE SERVER at 172.20.150.34

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Deploy Stable Production v1" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$sourceDir = "C:\ims-v1"
$htdocsDir = "C:\xampp\htdocs"
$backupDir = "C:\xampp\htdocs-backups"

# Step 1: Navigate to source directory
Write-Host "[1/8] Checking source directory..." -ForegroundColor Yellow
if (-not (Test-Path $sourceDir)) {
    Write-Host "[ERROR] Source directory not found: $sourceDir" -ForegroundColor Red
    exit 1
}
Set-Location $sourceDir
Write-Host "[OK] Source directory found" -ForegroundColor Green

# Step 2: Pull latest stable version
Write-Host ""
Write-Host "[2/8] Pulling stable version from Git..." -ForegroundColor Yellow
git fetch origin
git checkout old-working-ui
git pull origin old-working-ui
Write-Host "[OK] Stable version pulled" -ForegroundColor Green

# Step 3: Install dependencies
Write-Host ""
Write-Host "[3/8] Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Step 4: Build production bundle
Write-Host ""
Write-Host "[4/8] Building production bundle..." -ForegroundColor Yellow
npm run build
if (-not (Test-Path "$sourceDir\dist")) {
    Write-Host "[ERROR] Build failed - dist folder not created" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Production bundle built" -ForegroundColor Green

# Step 5: Create backup
Write-Host ""
Write-Host "[5/8] Creating backup..." -ForegroundColor Yellow
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$backupDir\htdocs-backup-$timestamp"
if (Test-Path "$htdocsDir\*") {
    Copy-Item -Path $htdocsDir -Destination $backupPath -Recurse -Force
    Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "[INFO] No existing files to backup" -ForegroundColor Cyan
}

# Step 6: Deploy to htdocs
Write-Host ""
Write-Host "[6/8] Deploying to server root..." -ForegroundColor Yellow
Get-ChildItem -Path $htdocsDir -Recurse | Remove-Item -Force -Recurse
Copy-Item -Path "$sourceDir\dist\*" -Destination $htdocsDir -Recurse -Force
Write-Host "[OK] Files deployed to $htdocsDir" -ForegroundColor Green

# Step 7: Create .htaccess for SPA routing (no proxy needed)
Write-Host ""
Write-Host "[7/8] Creating .htaccess..." -ForegroundColor Yellow
$htaccessContent = @"
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Don't rewrite files or directories that exist
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # Route everything to index.html for SPA
    RewriteRule ^ index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
"@
Set-Content -Path "$htdocsDir\.htaccess" -Value $htaccessContent -Encoding ASCII
Write-Host "[OK] .htaccess created" -ForegroundColor Green

# Step 8: Verify backend is running
Write-Host ""
Write-Host "[8/8] Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Backend server is running (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Backend server is not responding" -ForegroundColor Yellow
    Write-Host "   Starting backend server..." -ForegroundColor Yellow
    
    $backendPath = "$sourceDir\backend-server.cjs"
    if (Test-Path $backendPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$sourceDir'; node backend-server.cjs" -WindowStyle Minimized
        Start-Sleep -Seconds 3
        Write-Host "[OK] Backend server started" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Backend server file not found: $backendPath" -ForegroundColor Red
    }
}

# Final verification
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Verification:" -ForegroundColor Yellow

$jsFiles = Get-ChildItem -Path "$htdocsDir\assets\*.js" -ErrorAction SilentlyContinue
if ($jsFiles) {
    Write-Host "[OK] JavaScript files deployed:" -ForegroundColor Green
    foreach ($file in $jsFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 0)
        Write-Host "   - $($file.Name) ($sizeKB KB)" -ForegroundColor Cyan
    }
} else {
    Write-Host "[ERROR] No JavaScript files found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Application URL: http://172.20.150.34/" -ForegroundColor Cyan
Write-Host "Backend API: http://172.20.150.34:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "[!] IMPORTANT: Restart Apache manually from XAMPP Control Panel" -ForegroundColor Yellow
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "  Username: testadmin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Backup Location: $backupPath" -ForegroundColor Cyan
Write-Host ""
