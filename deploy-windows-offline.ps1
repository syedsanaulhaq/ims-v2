# ============================================================================
# IMS Offline Deploy Script for Windows Server (No Internet Required)
# ============================================================================
# Prerequisites: 
# 1. All files already copied to this directory
# 2. Node.js already installed on server
# 3. node_modules folder already present (copied from dev machine)
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMS Offline Deploy - Windows Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script deploys IMS without internet connection" -ForegroundColor Yellow
Write-Host ""

# Get current directory
$DEPLOY_PATH = Get-Location

Write-Host "Deploy Path: $DEPLOY_PATH" -ForegroundColor Yellow
Write-Host ""

# Database Configuration
$DB_HOST = "172.20.150.34"
$DB_DATABASE = "InventoryManagementDB"
$DB_USER = "inventorymanagementuser"
$DB_PASSWORD = "2016Wfp61@"
$BACKEND_PORT = 3001

# ============================================================================
# Step 1: Check Node.js
# ============================================================================
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js first:" -ForegroundColor Yellow
    Write-Host "  1. Copy node-v18.x.x-x64.msi installer to this server" -ForegroundColor Yellow
    Write-Host "  2. Run the installer" -ForegroundColor Yellow
    Write-Host "  3. Restart PowerShell and run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Download from internet-connected machine:" -ForegroundColor Gray
    Write-Host "  https://nodejs.org/en/download/" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "  [OK] npm is installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm is NOT installed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 2: Verify Required Files
# ============================================================================
Write-Host ""
Write-Host "[2/6] Verifying required files..." -ForegroundColor Cyan

$requiredFiles = @(
    "package.json",
    "backend-server.cjs"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file found" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

# Check folders
$requiredFolders = @("src", "public")
foreach ($folder in $requiredFolders) {
    if (Test-Path $folder) {
        Write-Host "  [OK] $folder/ folder found" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $folder/ folder" -ForegroundColor Yellow
    }
}

# Check node_modules
if (Test-Path "node_modules") {
    Write-Host "  [OK] node_modules/ folder found" -ForegroundColor Green
    $hasNodeModules = $true
} else {
    Write-Host "  [WARNING] node_modules/ folder NOT found" -ForegroundColor Yellow
    Write-Host "  You must copy node_modules from development machine" -ForegroundColor Yellow
    $hasNodeModules = $false
}

# Check dist folder
if (Test-Path "dist") {
    Write-Host "  [OK] dist/ folder found (frontend already built)" -ForegroundColor Green
    $hasDistFolder = $true
} else {
    Write-Host "  [INFO] dist/ folder not found, will need to build" -ForegroundColor Yellow
    $hasDistFolder = $false
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "[ERROR] Missing required files!" -ForegroundColor Red
    Write-Host "Please copy all project files from development machine" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 3: Create .env.sqlserver file
# ============================================================================
Write-Host ""
Write-Host "[3/6] Creating environment configuration..." -ForegroundColor Cyan

$envContent = @"
# SQL Server Configuration - PRODUCTION
SQL_SERVER_HOST=$DB_HOST
SQL_SERVER_DATABASE=$DB_DATABASE
SQL_SERVER_USER=$DB_USER
SQL_SERVER_PASSWORD=$DB_PASSWORD
SQL_SERVER_PORT=1433
SQL_SERVER_ENCRYPT=false
SQL_SERVER_TRUST_CERT=true
PORT=$BACKEND_PORT

# DS Database Configuration (for SSO)
DS_SQL_SERVER_HOST=$DB_HOST
DS_SQL_SERVER_DATABASE=DigitalSystemDB
DS_SQL_SERVER_USER=$DB_USER
DS_SQL_SERVER_PASSWORD=$DB_PASSWORD
DS_SQL_SERVER_PORT=1433

# JWT Configuration for SSO
JWT_SECRET=ChangeThisToAVerySecureRandomString123456789ProductionKey2024
"@

$envContent | Out-File -FilePath ".env.sqlserver" -Encoding UTF8
Write-Host "  [OK] Created .env.sqlserver" -ForegroundColor Green

# ============================================================================
# Step 4: Install Dependencies (if needed)
# ============================================================================
Write-Host ""
Write-Host "[4/6] Checking dependencies..." -ForegroundColor Cyan

if ($hasNodeModules) {
    Write-Host "  [OK] node_modules already present, skipping npm install" -ForegroundColor Green
    Write-Host "  (This saves time on offline server)" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] node_modules folder missing!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Cannot run npm install without internet connection." -ForegroundColor Yellow
    Write-Host "  Please copy node_modules from development machine:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  On dev machine:" -ForegroundColor Gray
    Write-Host "    cd E:\ECP-Projects\inventory-management-system-ims\ims-v1" -ForegroundColor Gray
    Write-Host "    npm install" -ForegroundColor Gray
    Write-Host "    Copy entire folder to: $DEPLOY_PATH\node_modules" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 5: Build Frontend (if needed)
# ============================================================================
Write-Host ""
Write-Host "[5/6] Checking frontend build..." -ForegroundColor Cyan

if ($hasDistFolder) {
    Write-Host "  [OK] dist/ folder exists, frontend already built" -ForegroundColor Green
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  [INFO] dist/ folder size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "  Building frontend (this may take 1-3 minutes)..." -ForegroundColor Gray
    
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Frontend built successfully" -ForegroundColor Green
        
        if (Test-Path "dist") {
            $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Host "  [OK] dist/ folder created ($([math]::Round($distSize, 2)) MB)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] dist/ folder was not created" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    } else {
        Write-Host "  [ERROR] Failed to build frontend" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Consider building on dev machine and copying dist/ folder" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# ============================================================================
# Step 6: Start Backend Server
# ============================================================================
Write-Host ""
Write-Host "[6/6] Starting backend server..." -ForegroundColor Cyan

# Check if backend is already running
$existingProcess = Get-Process -Name node -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "  [WARNING] Node process is already running" -ForegroundColor Yellow
    $response = Read-Host "  Stop all node processes and restart? (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "  [OK] Stopped existing node processes" -ForegroundColor Green
    }
}

# Start backend in new window
Write-Host "  Starting backend server on port $BACKEND_PORT..." -ForegroundColor Gray

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$DEPLOY_PATH'; Write-Host 'IMS Backend Server' -ForegroundColor Cyan; Write-Host 'Running on http://localhost:$BACKEND_PORT' -ForegroundColor Green; Write-Host ''; node backend-server.cjs"

Start-Sleep -Seconds 3

Write-Host "  [OK] Backend server started in new window" -ForegroundColor Green

# ============================================================================
# Deployment Complete
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] OFFLINE DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "[INFO] Application Location:" -ForegroundColor Cyan
Write-Host "   $DEPLOY_PATH" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Access URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:$BACKEND_PORT" -ForegroundColor White
Write-Host "   Frontend files: $DEPLOY_PATH\dist\" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Test Login Credentials:" -ForegroundColor Cyan
Write-Host "   Username: 1111111111111" -ForegroundColor White
Write-Host "   Password: 123456" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Test backend API:" -ForegroundColor Yellow
Write-Host "      Open browser: http://localhost:$BACKEND_PORT/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Setup IIS to serve frontend:" -ForegroundColor Yellow
Write-Host "      - Open IIS Manager" -ForegroundColor Gray
Write-Host "      - Create new website" -ForegroundColor Gray
Write-Host "      - Point to: $DEPLOY_PATH\dist" -ForegroundColor Gray
Write-Host "      - Set bindings (port 80 or 443)" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Configure reverse proxy for API:" -ForegroundColor Yellow
Write-Host "      - Install URL Rewrite and ARR modules in IIS" -ForegroundColor Gray
Write-Host "      - Configure /api/ route to http://localhost:$BACKEND_PORT" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Test database connection:" -ForegroundColor Yellow
Write-Host "      node check-users-quick.cjs" -ForegroundColor Gray
Write-Host ""

Write-Host "[!] Important Notes:" -ForegroundColor Yellow
Write-Host "   - Backend is running in a separate PowerShell window" -ForegroundColor White
Write-Host "   - Don't close the backend window" -ForegroundColor White
Write-Host "   - Server does not need internet connection" -ForegroundColor White
Write-Host "   - Database connection: $DB_HOST" -ForegroundColor White
Write-Host "   - All settings in: .env.sqlserver" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] To install as Windows Service:" -ForegroundColor Cyan
Write-Host "   See SERVER-SETUP-FROM-SCRATCH.md for node-windows setup" -ForegroundColor Gray
Write-Host "   (Requires one-time internet connection to install node-windows)" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
