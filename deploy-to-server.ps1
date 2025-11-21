# ============================================================================
# IMS Production Deployment Script - November 11, 2025 Stable Version
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IMS Production Deployment" -ForegroundColor Cyan
Write-Host "  Version: Nov 11, 2025 Stable" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$sourceDir = $PSScriptRoot  # Use current directory where script is located
$htdocsDir = "C:\xampp\htdocs"
$backupDir = "C:\xampp\htdocs-backups"

# Step 1: Install dependencies
Write-Host "[1/7] Installing dependencies..." -ForegroundColor Yellow
npm install jspdf jspdf-autotable
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Some dependencies may have issues, continuing..." -ForegroundColor Yellow
}
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Step 2: Build production bundle
Write-Host ""
Write-Host "[2/7] Building production bundle..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build completed" -ForegroundColor Green

# Step 3: Create backup
Write-Host ""
Write-Host "[3/7] Creating backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$backupDir\htdocs-backup-$timestamp"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
if (Test-Path $htdocsDir) {
    Copy-Item -Path $htdocsDir -Destination $backupPath -Recurse -Force
    Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "[INFO] No existing htdocs folder to backup" -ForegroundColor Yellow
}

# Step 4: Deploy to htdocs root
Write-Host ""
Write-Host "[4/7] Deploying to server root..." -ForegroundColor Yellow
if (-not (Test-Path $htdocsDir)) {
    New-Item -ItemType Directory -Path $htdocsDir | Out-Null
}
Get-ChildItem -Path $htdocsDir -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse
Copy-Item -Path "$PSScriptRoot\dist\*" -Destination $htdocsDir -Recurse -Force
Write-Host "[OK] Files deployed to $htdocsDir" -ForegroundColor Green

# Step 5: Stop old backend
Write-Host ""
Write-Host "[5/7] Stopping old backend..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*ims-v1*"} | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "[OK] Old backend stopped" -ForegroundColor Green

# Step 6: Start backend
Write-Host ""
Write-Host "[6/7] Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\ims-v1; node backend-server.cjs" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "[OK] Backend started on port 3001" -ForegroundColor Green

# Step 7: Restart Apache
Write-Host ""
Write-Host "[7/7] Restarting Apache..." -ForegroundColor Yellow
Get-Process -Name "httpd" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
try {
    & "C:\xampp\apache_start.bat"
    Start-Sleep -Seconds 3
    Write-Host "[OK] Apache restarted" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Apache restart may need manual intervention" -ForegroundColor Yellow
}

# Final verification
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://172.20.150.34/" -ForegroundColor Cyan
Write-Host "   Backend:  http://172.20.150.34:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Deployed Files:" -ForegroundColor Yellow
$jsFiles = Get-ChildItem -Path "$htdocsDir\assets\*.js" -ErrorAction SilentlyContinue
if ($jsFiles) {
    foreach ($file in $jsFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 0)
        Write-Host "   - $($file.Name) ($sizeKB KB)" -ForegroundColor Cyan
    }
}
Write-Host ""
Write-Host "[*] Backup Location: $backupPath" -ForegroundColor Yellow
Write-Host ""
