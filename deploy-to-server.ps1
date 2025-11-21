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
$sourceDir = "E:\ECP-Projects\inventory-management-system-ims\ims-v1"
$htdocsDir = "C:\xampp\htdocs"
$imsDir = "$htdocsDir\ims"
$backupDir = "C:\xampp\htdocs-backups"

# Step 1: Build production bundle
Write-Host "[1/6] Building production bundle..." -ForegroundColor Yellow
Set-Location $sourceDir
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build completed" -ForegroundColor Green

# Step 2: Create backup
Write-Host ""
Write-Host "[2/6] Creating backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$backupDir\htdocs-backup-$timestamp"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
if (Test-Path $imsDir) {
    Copy-Item -Path $imsDir -Destination $backupPath -Recurse -Force
    Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "[INFO] No existing IMS folder to backup" -ForegroundColor Yellow
}

# Step 3: Deploy to /ims subdirectory
Write-Host ""
Write-Host "[3/6] Deploying to server..." -ForegroundColor Yellow
if (-not (Test-Path $imsDir)) {
    New-Item -ItemType Directory -Path $imsDir | Out-Null
}
Get-ChildItem -Path $imsDir -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse
Copy-Item -Path "$sourceDir\dist\*" -Destination $imsDir -Recurse -Force
Write-Host "[OK] Files deployed to $imsDir" -ForegroundColor Green

# Step 4: Stop old backend
Write-Host ""
Write-Host "[4/6] Stopping old backend..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*ims-v1*"} | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "[OK] Old backend stopped" -ForegroundColor Green

# Step 5: Start backend
Write-Host ""
Write-Host "[5/6] Starting backend server..." -ForegroundColor Yellow
$backendPath = "C:\ims-v1\backend-server.cjs"
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\ims-v1; node backend-server.cjs" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "[OK] Backend started on port 3001" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend file not found at $backendPath" -ForegroundColor Red
    Write-Host "[INFO] Please ensure code is deployed to C:\ims-v1 on server" -ForegroundColor Yellow
}

# Step 6: Restart Apache
Write-Host ""
Write-Host "[6/6] Restarting Apache..." -ForegroundColor Yellow
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
Write-Host "   Frontend: http://172.20.150.34/ims/" -ForegroundColor Cyan
Write-Host "   Backend:  http://172.20.150.34:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Deployed Files:" -ForegroundColor Yellow
$jsFiles = Get-ChildItem -Path "$imsDir\assets\*.js" -ErrorAction SilentlyContinue
if ($jsFiles) {
    foreach ($file in $jsFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 0)
        Write-Host "   - $($file.Name) ($sizeKB KB)" -ForegroundColor Cyan
    }
}
Write-Host ""
Write-Host "[*] Backup Location: $backupPath" -ForegroundColor Yellow
Write-Host ""
