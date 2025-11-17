########################################
# IMS Production Startup Script
########################################
# This script:
# 1. Builds the frontend with production config
# 2. Deploys to XAMPP
# 3. Starts the backend server
# 4. Starts Apache
########################################

param(
    [switch]$SkipBuild,
    [switch]$SkipDeploy,
    [switch]$BackendOnly
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "IMS PRODUCTION STARTUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$IMS_PATH = "C:\ims-v1"
$XAMPP_PATH = "C:\xampp"
$DEPLOY_PATH = "$XAMPP_PATH\htdocs\ims"

# Step 1: Build Frontend (unless skipped)
if (-not $SkipBuild -and -not $BackendOnly) {
    Write-Host "[1/4] Building frontend for production..." -ForegroundColor Yellow
    
    if (Test-Path $IMS_PATH) {
        Push-Location $IMS_PATH
        
        Write-Host "  Running: npm run build" -ForegroundColor Gray
        npm run build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Build failed!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        
        Write-Host "  [OK] Build completed" -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "  [ERROR] IMS path not found: $IMS_PATH" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[1/4] Skipping build (using existing dist/)" -ForegroundColor Gray
}

# Step 2: Deploy to XAMPP (unless skipped)
if (-not $SkipDeploy -and -not $BackendOnly) {
    Write-Host "`n[2/4] Deploying to XAMPP..." -ForegroundColor Yellow
    
    if (Test-Path "$IMS_PATH\dist") {
        # Create deployment directory if it doesn't exist
        if (-not (Test-Path $DEPLOY_PATH)) {
            New-Item -ItemType Directory -Path $DEPLOY_PATH -Force | Out-Null
            Write-Host "  Created directory: $DEPLOY_PATH" -ForegroundColor Gray
        }
        
        # Clean old files
        Write-Host "  Cleaning old deployment..." -ForegroundColor Gray
        Remove-Item "$DEPLOY_PATH\*" -Recurse -Force -ErrorAction SilentlyContinue
        
        # Copy new files
        Write-Host "  Copying new files..." -ForegroundColor Gray
        Copy-Item -Path "$IMS_PATH\dist\*" -Destination $DEPLOY_PATH -Recurse -Force
        
        # Create .htaccess
        $htaccess = @"
# IMS Apache Configuration
RewriteEngine On
RewriteBase /ims/

# Proxy API requests to backend
RewriteRule ^api/(.*)$ http://localhost:3001/api/`$1 [P,L]

# Don't rewrite files or directories
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Rewrite everything else to index.html for React Router
RewriteRule . /ims/index.html [L]
"@
        $htaccess | Out-File -FilePath "$DEPLOY_PATH\.htaccess" -Encoding ASCII -Force
        
        Write-Host "  [OK] Deployed to $DEPLOY_PATH" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] dist folder not found: $IMS_PATH\dist" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[2/4] Skipping deployment" -ForegroundColor Gray
}

# Step 3: Start Apache
if (-not $BackendOnly) {
    Write-Host "`n[3/4] Starting Apache..." -ForegroundColor Yellow
    
    if (Test-Path "$XAMPP_PATH\apache_start.bat") {
        Push-Location $XAMPP_PATH
        
        # Check if Apache is already running
        $apacheRunning = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
        
        if ($apacheRunning) {
            Write-Host "  [INFO] Apache is already running" -ForegroundColor Gray
            Write-Host "  Restarting Apache..." -ForegroundColor Gray
            & "$XAMPP_PATH\apache_stop.bat"
            Start-Sleep -Seconds 2
        }
        
        & "$XAMPP_PATH\apache_start.bat"
        Start-Sleep -Seconds 2
        
        # Verify Apache started
        $apacheRunning = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
        if ($apacheRunning) {
            Write-Host "  [OK] Apache started" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Apache may not have started. Check XAMPP Control Panel" -ForegroundColor Yellow
        }
        
        Pop-Location
    } else {
        Write-Host "  [INFO] Using XAMPP Control Panel to manage Apache" -ForegroundColor Gray
    }
} else {
    Write-Host "`n[3/4] Skipping Apache (backend only mode)" -ForegroundColor Gray
}

# Step 4: Start Backend
Write-Host "`n[4/4] Starting backend server..." -ForegroundColor Yellow

Push-Location $IMS_PATH

# Check if backend is already running
$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($backendRunning) {
    Write-Host "  [WARNING] Port 3001 is already in use" -ForegroundColor Yellow
    Write-Host "  Kill existing process? (y/n): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'y') {
        $processId = $backendRunning.OwningProcess
        Stop-Process -Id $processId -Force
        Write-Host "  [OK] Stopped existing backend process" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "  [INFO] Using existing backend process" -ForegroundColor Gray
        Pop-Location
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "PRODUCTION STARTUP COMPLETE" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "`nAccess the application at:" -ForegroundColor Cyan
        Write-Host "  http://localhost/ims" -ForegroundColor White
        Write-Host "  http://172.20.150.34/ims`n" -ForegroundColor White
        exit 0
    }
}

Write-Host "  Starting backend on port 3001..." -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop the backend server`n" -ForegroundColor Yellow

# Start backend (this will block)
node backend-server.cjs

Pop-Location
