# ============================================================================
# IMS Simple Deploy Script for Windows Server (No Git Clone)
# ============================================================================
# Run this script from the ims-v1 folder that you've already created
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMS Simple Deploy - Windows Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$DEPLOY_PATH = Get-Location

Write-Host "Deploy Path: $DEPLOY_PATH" -ForegroundColor Yellow
Write-Host ""

# Database Configuration - EDIT THESE IF NEEDED
$DB_HOST = "172.20.150.34"
$DB_DATABASE = "InventoryManagementDB"
$DB_USER = "inventorymanagementuser"
$DB_PASSWORD = "2016Wfp61@"
$BACKEND_PORT = 3001

# ============================================================================
# Step 1: Check Node.js
# ============================================================================
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://nodejs.org/en/download/" -ForegroundColor Yellow
    Write-Host "  2. Choose 'Windows Installer (.msi)' - 64-bit" -ForegroundColor Yellow
    Write-Host "  3. Run installer and accept defaults" -ForegroundColor Yellow
    Write-Host "  4. Restart PowerShell and run this script again" -ForegroundColor Yellow
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
# Step 2: Check if package.json exists
# ============================================================================
Write-Host ""
Write-Host "[2/5] Checking project files..." -ForegroundColor Cyan

if (!(Test-Path "package.json")) {
    Write-Host "  [ERROR] package.json not found in current directory!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please make sure you have copied all project files to:" -ForegroundColor Yellow
    Write-Host "  $DEPLOY_PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "Required files:" -ForegroundColor Yellow
    Write-Host "  - package.json" -ForegroundColor Gray
    Write-Host "  - backend-server.cjs" -ForegroundColor Gray
    Write-Host "  - src/ folder" -ForegroundColor Gray
    Write-Host "  - public/ folder" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  [OK] package.json found" -ForegroundColor Green

if (Test-Path "backend-server.cjs") {
    Write-Host "  [OK] backend-server.cjs found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] backend-server.cjs not found" -ForegroundColor Yellow
}

if (Test-Path "src") {
    Write-Host "  [OK] src/ folder found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] src/ folder not found" -ForegroundColor Yellow
}

# ============================================================================
# Step 3: Create .env.sqlserver file
# ============================================================================
Write-Host ""
Write-Host "[3/5] Creating environment configuration..." -ForegroundColor Cyan

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
# Step 4: Install dependencies
# ============================================================================
Write-Host ""
Write-Host "[4/5] Installing dependencies..." -ForegroundColor Cyan
Write-Host "  This may take 2-5 minutes..." -ForegroundColor Gray

npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to install dependencies" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  - Internet connection is working" -ForegroundColor Gray
    Write-Host "  - npm is properly configured" -ForegroundColor Gray
    Write-Host "  - package.json exists in current directory" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 5: Build frontend
# ============================================================================
Write-Host ""
Write-Host "[5/5] Building frontend for production..." -ForegroundColor Cyan
Write-Host "  This may take 1-3 minutes..." -ForegroundColor Gray

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Frontend built successfully" -ForegroundColor Green
    
    # Check if dist folder was created
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
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Start backend server
# ============================================================================
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Cyan

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

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$DEPLOY_PATH'; node backend-server.cjs"

Start-Sleep -Seconds 3

Write-Host "  [OK] Backend server started in new window" -ForegroundColor Green

# ============================================================================
# Deployment Complete
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "[INFO] Application Location:" -ForegroundColor Cyan
Write-Host "   $DEPLOY_PATH" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Access URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:$BACKEND_PORT" -ForegroundColor White
Write-Host "   Frontend: Open dist/index.html in browser" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Test Login Credentials:" -ForegroundColor Cyan
Write-Host "   Username: 1111111111111" -ForegroundColor White
Write-Host "   Password: 123456" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Setup IIS to serve the dist/ folder" -ForegroundColor Yellow
Write-Host "      - Create new website in IIS Manager" -ForegroundColor Gray
Write-Host "      - Point to: $DEPLOY_PATH\dist" -ForegroundColor Gray
Write-Host "      - Set bindings (port 80 or 443)" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Configure reverse proxy for API" -ForegroundColor Yellow
Write-Host "      - Install URL Rewrite and ARR modules" -ForegroundColor Gray
Write-Host "      - Configure proxy for /api/ to http://localhost:$BACKEND_PORT" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Install backend as Windows Service (optional)" -ForegroundColor Yellow
Write-Host "      - Run: npm install -g node-windows" -ForegroundColor Gray
Write-Host "      - See documentation for service setup" -ForegroundColor Gray
Write-Host ""

Write-Host "[!] Important Notes:" -ForegroundColor Yellow
Write-Host "   - Backend is running in a separate PowerShell window" -ForegroundColor White
Write-Host "   - Don't close the backend window" -ForegroundColor White
Write-Host "   - Database credentials are in: .env.sqlserver" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
