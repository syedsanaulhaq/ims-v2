# =====================================================
# Deploy to Demo Stage Script
# =====================================================
# Purpose: Deploy from Development to Demo Stage
# Database: InvMISDB (same as staging/production)
# Ports: Demo uses 5002 (backend) and 8082 (frontend)
# Usage: ./deploy-demo.ps1
# =====================================================

Write-Host "`n" -NoNewline
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🎬 DEPLOY TO DEMO STAGE" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running Node processes
Write-Host "[1/7] Stopping all running servers..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "      ✅ All servers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Switch to demo environment
Write-Host "[2/7] Switching to DEMO environment..." -ForegroundColor Yellow
Copy-Item -Path ".env.demo" -Destination ".env" -Force
Write-Host "      ✅ Environment switched to DEMO" -ForegroundColor Green
Write-Host ""

# Step 3: Update .env.sqlserver for demo
Write-Host "[3/7] Configuring backend for DEMO stage..." -ForegroundColor Yellow
$sqlServerConfig = @"
# SQL Server Configuration - Demo Stage
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433 
SQL_SERVER_ENCRYPT=false 
SQL_SERVER_TRUST_CERT=true 
PORT=5002
"@
Set-Content -Path ".env.sqlserver" -Value $sqlServerConfig
Write-Host "      ✅ Backend configured for port 5002" -ForegroundColor Green
Write-Host ""

# Step 4: Clean old build
Write-Host "[4/7] Cleaning old build files..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "      ✅ Old build cleaned" -ForegroundColor Green
} else {
    Write-Host "      ℹ️  No old build to clean" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Build the application
Write-Host "[5/7] Building application for DEMO..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✅ Application built successfully" -ForegroundColor Green
} else {
    Write-Host "      ❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Update vite config for demo port
Write-Host "[6/7] Configuring Vite preview for port 8082..." -ForegroundColor Yellow
$viteConfigPath = "vite.config.ts"
$viteConfig = Get-Content $viteConfigPath -Raw

# Check if preview config exists, if not add it
if ($viteConfig -notmatch "preview:\s*{") {
    $viteConfig = $viteConfig -replace "(server:\s*{[^}]*})", "`$1,`n  preview: {`n    port: 8082,`n    strictPort: true,`n    host: true`n  }"
    Set-Content -Path $viteConfigPath -Value $viteConfig
    Write-Host "      ✅ Vite preview configured for port 8082" -ForegroundColor Green
} else {
    Write-Host "      ℹ️  Vite preview already configured" -ForegroundColor Gray
}
Write-Host ""

# Step 7: Start servers
Write-Host "[7/7] Starting DEMO servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "      🌐 Frontend URL: " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:8082" -ForegroundColor White
Write-Host "      🔌 Backend API:  " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:5002" -ForegroundColor White
Write-Host "      🗄️  Database:    " -NoNewline -ForegroundColor Cyan
Write-Host "InventoryManagementDB on SYED-FAZLI-LAPT" -ForegroundColor White
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🎉 DEMO ENVIRONMENT READY!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the servers" -ForegroundColor Yellow
Write-Host ""

# Start both backend and frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node backend-server.cjs"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run preview -- --port 8082 --host"

Write-Host "✅ Servers started in separate windows" -ForegroundColor Green
Write-Host ""
