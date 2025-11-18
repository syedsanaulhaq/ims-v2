# Complete Rebuild and Deploy Script
Write-Host "`n[DEPLOY] Complete Rebuild and Deployment..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Step 1: Pull latest code
Write-Host "`n[STEP 1] Pulling latest code from GitHub..." -ForegroundColor Yellow
try {
    git pull origin invmisdb-rebuild-sept14-2025
    Write-Host "  [OK] Code updated" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Git pull failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Build frontend
Write-Host "`n[STEP 2] Building frontend..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "  [OK] Build complete" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Check build output
Write-Host "`n[STEP 3] Checking build output..." -ForegroundColor Yellow
$distPath = ".\dist"
if (Test-Path $distPath) {
    $indexFiles = Get-ChildItem "$distPath\assets\index-*.js"
    if ($indexFiles) {
        Write-Host "  [OK] Found build files:" -ForegroundColor Green
        $indexFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
    } else {
        Write-Host "  [ERROR] No index-*.js files found in build" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [ERROR] dist folder not found" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy to XAMPP
Write-Host "`n[STEP 4] Deploying to XAMPP..." -ForegroundColor Yellow
$xamppPath = "C:\xampp\htdocs\ims"

if (Test-Path $xamppPath) {
    # Remove old files (except .htaccess)
    Write-Host "  Removing old files..." -ForegroundColor Gray
    Get-ChildItem $xamppPath -Exclude ".htaccess",".htaccess.backup*" | Remove-Item -Recurse -Force
    
    # Copy new files
    Write-Host "  Copying new files..." -ForegroundColor Gray
    Copy-Item -Path "$distPath\*" -Destination $xamppPath -Recurse -Force
    
    Write-Host "  [OK] Files deployed" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] XAMPP path not found: $xamppPath" -ForegroundColor Red
    exit 1
}

# Step 5: Verify deployment
Write-Host "`n[STEP 5] Verifying deployment..." -ForegroundColor Yellow
$deployedIndexFiles = Get-ChildItem "$xamppPath\assets\index-*.js"
if ($deployedIndexFiles) {
    Write-Host "  [OK] Deployed files:" -ForegroundColor Green
    $deployedIndexFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
    
    # Compare with build
    $buildHash = ($indexFiles[0].Name -split '-')[1] -replace '\.js$', ''
    $deployedHash = ($deployedIndexFiles[0].Name -split '-')[1] -replace '\.js$', ''
    
    if ($buildHash -eq $deployedHash) {
        Write-Host "  [OK] Deployment verified (hash: $buildHash)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Hash mismatch - Build: $buildHash, Deployed: $deployedHash" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] No index files found in deployed location" -ForegroundColor Red
    exit 1
}

# Step 6: Check .htaccess
Write-Host "`n[STEP 6] Checking .htaccess..." -ForegroundColor Yellow
$htaccessPath = "$xamppPath\.htaccess"
if (Test-Path $htaccessPath) {
    $htaccessContent = Get-Content $htaccessPath -Raw
    if ($htaccessContent -match 'RewriteRule \^api/\(\.\*\)\$ http://localhost:3001/api/\$1 \[P,L\]') {
        Write-Host "  [OK] .htaccess proxy rule is correct" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] .htaccess proxy rule may be incorrect" -ForegroundColor Yellow
        Write-Host "  Run: .\fix-htaccess.ps1" -ForegroundColor Gray
    }
} else {
    Write-Host "  [ERROR] .htaccess not found" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host "`n[NEXT STEPS]" -ForegroundColor Cyan
Write-Host "  1. Hard refresh browser: Ctrl+F5 or Ctrl+Shift+R" -ForegroundColor Gray
Write-Host "  2. Check new JS file is loaded (should NOT be index-Dai0IMg3.js)" -ForegroundColor Gray
Write-Host "  3. Verify no CORS errors in console" -ForegroundColor Gray
Write-Host ""
