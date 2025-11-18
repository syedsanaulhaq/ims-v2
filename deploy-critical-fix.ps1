# CRITICAL FIX DEPLOYMENT SCRIPT
# Run this on the SERVER at C:\ims-v1
# Fixes: "ReferenceError: getApiBaseUrl is not defined"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING CRITICAL FIX TO PRODUCTION" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Pull latest code
Write-Host "Step 1: Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin invmisdb-rebuild-sept14-2025

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Git pull failed!" -ForegroundColor Red
    exit 1
}

Write-Host "OK Code updated successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Build the project
Write-Host "Step 2: Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "OK Build completed successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy to Apache htdocs
Write-Host "Step 3: Deploying to C:\xampp\htdocs\ims..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "C:\xampp\htdocs\ims" -Recurse -Force

if ($LASTEXITCODE -eq 0 -or $?) {
    Write-Host "OK Files deployed successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "X Deployment failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Verify deployment
Write-Host "Step 4: Verifying deployment..." -ForegroundColor Yellow
$indexFiles = Get-ChildItem "C:\xampp\htdocs\ims\assets\index-*.js" | Select-Object Name, LastWriteTime | Sort-Object LastWriteTime -Descending

Write-Host ""
Write-Host "Deployed index files:" -ForegroundColor Cyan
$indexFiles | Format-Table -AutoSize

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open browser and navigate to: http://localhost/ims/" -ForegroundColor White
Write-Host "2. Clear browser cache (Ctrl+Shift+Delete) or Hard Refresh (Ctrl+F5)" -ForegroundColor White
Write-Host "3. Login and verify NO getApiBaseUrl error" -ForegroundColor White
Write-Host "4. Check Console - should see API calls to /ims/api/*" -ForegroundColor White
Write-Host ""
Write-Host "Expected build file: index-BMmRSzM6.js" -ForegroundColor Magenta
Write-Host "This version fixes the module initialization error!" -ForegroundColor Green
Write-Host ""
