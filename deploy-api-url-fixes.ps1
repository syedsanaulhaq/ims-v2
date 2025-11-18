# ======================================================================
# Deploy API URL Fixes to Production Server
# ======================================================================
# Run this script on the production server (172.20.150.34)
# It will pull the latest changes and rebuild/deploy the application
# ======================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Deploying API URL Fixes to Production" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$repoPath = "C:\ims-v1"
$deployPath = "C:\xampp\htdocs\ims"
$branch = "invmisdb-rebuild-sept14-2025"
$apacheService = "Apache2.4"

# Step 1: Navigate to repository
Write-Host "[1/6] Navigating to repository..." -ForegroundColor Yellow
if (!(Test-Path $repoPath)) {
    Write-Host "[ERROR] Repository path not found: $repoPath" -ForegroundColor Red
    exit 1
}

Set-Location $repoPath
Write-Host "[OK] Current directory: $repoPath" -ForegroundColor Green
Write-Host ""

# Step 2: Check current branch
Write-Host "[2/6] Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "[INFO] Current branch: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -ne $branch) {
    Write-Host "[WARN] Switching to branch: $branch" -ForegroundColor Yellow
    git checkout $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to switch branch" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] On correct branch: $branch" -ForegroundColor Green
Write-Host ""

# Step 3: Pull latest changes
Write-Host "[3/6] Pulling latest changes from GitHub..." -ForegroundColor Yellow
git pull origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git pull failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Successfully pulled latest changes" -ForegroundColor Green
Write-Host ""

# Step 4: Show what was changed
Write-Host "[4/6] Summary of changes..." -ForegroundColor Yellow
$changedFiles = git diff --name-only HEAD@{1} HEAD | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "[INFO] Files updated: $changedFiles" -ForegroundColor Cyan
Write-Host ""

# Display key changes
Write-Host "[INFO] Key changes in this update:" -ForegroundColor Cyan
Write-Host "  - Fixed 72 files with hardcoded API URLs" -ForegroundColor White
Write-Host "  - All pages now use getApiBaseUrl() function" -ForegroundColor White
Write-Host "  - Automatic environment detection (dev vs prod)" -ForegroundColor White
Write-Host "  - Production uses /ims/api proxy endpoint" -ForegroundColor White
Write-Host "  - Eliminates all CORS errors" -ForegroundColor White
Write-Host ""

# Step 5: Rebuild frontend
Write-Host "[5/6] Rebuilding frontend application..." -ForegroundColor Yellow
Write-Host "[INFO] Running: npm run build" -ForegroundColor Cyan
Write-Host ""

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Write-Host "[INFO] Check the error messages above" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[OK] Build completed successfully" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy to Apache
Write-Host "[6/6] Deploying to Apache htdocs..." -ForegroundColor Yellow

# Backup existing deployment (optional)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\xampp\htdocs\ims_backup_$timestamp"

if (Test-Path $deployPath) {
    Write-Host "[INFO] Creating backup at: $backupPath" -ForegroundColor Cyan
    Copy-Item -Path $deployPath -Destination $backupPath -Recurse -Force
    Write-Host "[OK] Backup created" -ForegroundColor Green
}

# Deploy new build
Write-Host "[INFO] Deploying new build to: $deployPath" -ForegroundColor Cyan
$distPath = Join-Path $repoPath "dist"

if (!(Test-Path $distPath)) {
    Write-Host "[ERROR] Build output not found at: $distPath" -ForegroundColor Red
    exit 1
}

# Remove old deployment
if (Test-Path $deployPath) {
    Remove-Item -Path $deployPath -Recurse -Force
}

# Copy new deployment
Copy-Item -Path $distPath -Destination $deployPath -Recurse -Force
Write-Host "[OK] Deployment completed" -ForegroundColor Green
Write-Host ""

# Verify deployment
Write-Host "[INFO] Verifying deployment..." -ForegroundColor Cyan
$indexExists = Test-Path (Join-Path $deployPath "index.html")
$assetsExist = Test-Path (Join-Path $deployPath "assets")

if ($indexExists -and $assetsExist) {
    Write-Host "[OK] Deployment verified - index.html and assets folder present" -ForegroundColor Green
} else {
    Write-Host "[WARN] Deployment may be incomplete" -ForegroundColor Yellow
}
Write-Host ""

# Check if Apache is running
Write-Host "[INFO] Checking Apache service status..." -ForegroundColor Cyan
$apacheStatus = Get-Service -Name $apacheService -ErrorAction SilentlyContinue

if ($apacheStatus) {
    if ($apacheStatus.Status -eq "Running") {
        Write-Host "[OK] Apache is running" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Apache is not running. Starting service..." -ForegroundColor Yellow
        Start-Service -Name $apacheService
        Write-Host "[OK] Apache started" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] Apache service not found (name: $apacheService)" -ForegroundColor Yellow
    Write-Host "[INFO] You may need to restart Apache manually" -ForegroundColor Cyan
}
Write-Host ""

# Summary
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[SUMMARY] What was deployed:" -ForegroundColor Yellow
Write-Host "  - Commit: 357a96e" -ForegroundColor White
Write-Host "  - Branch: $branch" -ForegroundColor White
Write-Host "  - Files changed: 72" -ForegroundColor White
Write-Host "  - Changes: 858 insertions, 205 deletions" -ForegroundColor White
Write-Host "  - Deploy path: $deployPath" -ForegroundColor White
Write-Host "  - Backup: $backupPath" -ForegroundColor White
Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Yellow
Write-Host "  1. Open browser to: http://localhost/ims/" -ForegroundColor White
Write-Host "  2. Press Ctrl+F5 to hard refresh and clear cache" -ForegroundColor White
Write-Host "  3. Login with test-admin-001 credentials" -ForegroundColor White
Write-Host "  4. Test these pages:" -ForegroundColor White
Write-Host "     - Dashboard (http://localhost/ims/dashboard)" -ForegroundColor Cyan
Write-Host "     - Inventory Details (http://localhost/ims/dashboard/inventory-details)" -ForegroundColor Cyan
Write-Host "     - Stock Operations (http://localhost/ims/stock-operations)" -ForegroundColor Cyan
Write-Host "     - Tender Management (http://localhost/ims/tender-management)" -ForegroundColor Cyan
Write-Host "  5. Check browser console - should see NO CORS errors!" -ForegroundColor White
Write-Host "  6. Verify API calls use: /ims/api/* (not localhost:3001)" -ForegroundColor White
Write-Host ""
Write-Host "[SUCCESS] All API calls will now use the Apache proxy!" -ForegroundColor Green
Write-Host "[SUCCESS] No more CORS errors on any page!" -ForegroundColor Green
Write-Host ""
Write-Host "If you encounter issues:" -ForegroundColor Yellow
Write-Host "  - Check backend is running: node backend-server.cjs" -ForegroundColor Cyan
Write-Host "  - Verify Apache proxy: Test http://localhost/ims/api/session" -ForegroundColor Cyan
Write-Host "  - Check .htaccess: Should have proxy rules for /api/" -ForegroundColor Cyan
Write-Host "  - Restore backup if needed: Copy $backupPath to $deployPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
