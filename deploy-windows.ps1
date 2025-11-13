# ============================================================================
# IMS Auto-Deploy Script for Windows Server
# ============================================================================
# This script will:
# 1. Check/Install Node.js, Git
# 2. Clone repository from GitHub
# 3. Install dependencies
# 4. Build frontend
# 5. Configure environment
# 6. Start backend server
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMS Auto-Deploy Script - Windows Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration - EDIT THESE VALUES
$DEPLOY_PATH = "C:\inetpub\wwwroot\ims-v1"

# GitHub Credentials - ADD YOUR CREDENTIALS HERE
$GIT_USERNAME = "ecp-developer"
$GIT_PASSWORD = "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"  # GitHub Personal Access Token
# To create token: GitHub.com -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic) -> Generate new token
# Required scope: repo (Full control of private repositories)

$GIT_REPO = "https://github.com/ecp-developer/inventory-management-system-ims.git"
$GIT_BRANCH = "invmisdb-rebuild-sept14-2025"

# Database Configuration - EDIT THESE
$DB_HOST = "172.20.150.34"
$DB_DATABASE = "InventoryManagementDB"
$DB_USER = "inventorymanagementuser"
$DB_PASSWORD = "2016Wfp61@"
$BACKEND_PORT = 3001

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Deploy Path: $DEPLOY_PATH" -ForegroundColor Gray
Write-Host "  Database: $DB_HOST\$DB_DATABASE" -ForegroundColor Gray
Write-Host "  Backend Port: $BACKEND_PORT" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# Step 1: Check Node.js
# ============================================================================
Write-Host "[1/8] Checking Node.js..." -ForegroundColor Cyan
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
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "  [OK] npm is installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm is NOT installed!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Step 2: Check Git
# ============================================================================
Write-Host ""
Write-Host "[2/8] Checking Git..." -ForegroundColor Cyan
try {
    $gitVersion = git --version
    Write-Host "  [OK] Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Git is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "  2. Run installer and accept defaults" -ForegroundColor Yellow
    Write-Host "  3. Restart PowerShell and run this script again" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Step 3: Check Network Connectivity to GitHub
# ============================================================================
Write-Host ""
Write-Host "[3/8] Checking GitHub connectivity..." -ForegroundColor Cyan

try {
    Write-Host "  Testing connection to github.com..." -ForegroundColor Gray
    $webTest = Invoke-WebRequest -Uri "https://github.com" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] Successfully connected to github.com" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Cannot connect to github.com!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Your server cannot reach GitHub. Options:" -ForegroundColor Yellow
    Write-Host "  1. Check internet connection" -ForegroundColor Gray
    Write-Host "  2. Check firewall settings (allow port 443)" -ForegroundColor Gray
    Write-Host "  3. Check proxy settings if behind corporate firewall" -ForegroundColor Gray
    Write-Host "  4. Use deploy-windows-simple.ps1 and manually copy files instead" -ForegroundColor Gray
    Write-Host ""
    $response = Read-Host "Continue anyway and try Git clone? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

# ============================================================================
# Step 4: Create deployment directory and clone repository
# ============================================================================
Write-Host ""
Write-Host "[4/8] Setting up deployment directory..." -ForegroundColor Cyan

# Create parent directory if it doesn't exist
$parentDir = Split-Path -Parent $DEPLOY_PATH
if (!(Test-Path $parentDir)) {
    Write-Host "  Creating directory: $parentDir" -ForegroundColor Gray
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

# Check if deployment path already exists
if (Test-Path $DEPLOY_PATH) {
    Write-Host "  Directory already exists: $DEPLOY_PATH" -ForegroundColor Yellow
    $response = Read-Host "  Delete and re-clone? (y/n)"
    if ($response -eq 'y') {
        Write-Host "  Removing existing directory..." -ForegroundColor Gray
        Remove-Item -Path $DEPLOY_PATH -Recurse -Force
    } else {
        Write-Host "  Using existing directory..." -ForegroundColor Gray
        Set-Location $DEPLOY_PATH
    }
}

# Clone repository if directory doesn't exist
if (!(Test-Path $DEPLOY_PATH)) {
    Write-Host "  Cloning repository from GitHub..." -ForegroundColor Gray
    Set-Location $parentDir
    
    # Build Git URL with credentials if password provided
    if ($GIT_PASSWORD -ne "") {
        $GIT_REPO_WITH_AUTH = $GIT_REPO.Replace("https://", "https://${GIT_USERNAME}:${GIT_PASSWORD}@")
        Write-Host "  Using authenticated Git clone..." -ForegroundColor Gray
        git clone $GIT_REPO_WITH_AUTH
    } else {
        Write-Host "  Using public Git clone (no credentials)..." -ForegroundColor Gray
        Write-Host "  If repository is private, add GitHub Personal Access Token to script" -ForegroundColor Yellow
        git clone $GIT_REPO
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  [ERROR] Failed to clone repository!" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Possible reasons:" -ForegroundColor Yellow
        Write-Host "  1. No internet connection or can't reach github.com" -ForegroundColor Gray
        Write-Host "  2. Repository is private and needs authentication" -ForegroundColor Gray
        Write-Host "  3. Firewall blocking port 443" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Solutions:" -ForegroundColor Yellow
        Write-Host "  - Check internet: ping github.com" -ForegroundColor Gray
        Write-Host "  - Add GitHub token to line 21 of this script" -ForegroundColor Gray
        Write-Host "  - Or manually copy files to $DEPLOY_PATH and use deploy-windows-simple.ps1" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Navigate to ims-v1 folder
    $repoName = $GIT_REPO.Split('/')[-1].Replace('.git', '')
    Set-Location "$parentDir\$repoName\ims-v1"
    
    # Checkout specific branch
    Write-Host "  Checking out branch: $GIT_BRANCH" -ForegroundColor Gray
    git checkout $GIT_BRANCH
    
    # Copy to final location if different
    if ($DEPLOY_PATH -ne "$parentDir\$repoName\ims-v1") {
        Copy-Item -Path "$parentDir\$repoName\ims-v1" -Destination $DEPLOY_PATH -Recurse -Force
        Set-Location $DEPLOY_PATH
    }
    
    Write-Host "  [OK] Repository cloned successfully" -ForegroundColor Green
} else {
    Write-Host "  [OK] Using existing repository" -ForegroundColor Green
}# ============================================================================
# Step 5: Create .env.sqlserver file
# ============================================================================
Write-Host ""
Write-Host "[5/9] Creating environment configuration..." -ForegroundColor Cyan

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
# Step 6: Install dependencies
# ============================================================================
Write-Host ""
Write-Host "[6/9] Installing dependencies..." -ForegroundColor Cyan
Write-Host "  This may take 2-5 minutes..." -ForegroundColor Gray

npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Step 7: Build frontend
# ============================================================================
Write-Host ""
Write-Host "[7/9] Building frontend for production..." -ForegroundColor Cyan
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
        exit 1
    }
} else {
    Write-Host "  [ERROR] Failed to build frontend" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Step 8: Test database connection
# ============================================================================
Write-Host ""
Write-Host "[8/9] Testing database connection..." -ForegroundColor Cyan

if (Test-Path "check-users-quick.cjs") {
    try {
        $dbTest = node check-users-quick.cjs 2>&1
        if ($dbTest -match "Connected") {
            Write-Host "  [OK] Database connection successful" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Could not verify database connection" -ForegroundColor Yellow
            Write-Host "  Check .env.sqlserver file if login fails" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [WARNING] Could not test database connection" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] Database test script not found, skipping" -ForegroundColor Yellow
}

# ============================================================================
# Step 9: Start backend server
# ============================================================================
Write-Host ""
Write-Host "[9/9] Starting backend server..." -ForegroundColor Cyan

# Check if backend is already running
$existingProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*$DEPLOY_PATH*" }
if ($existingProcess) {
    Write-Host "  Backend is already running (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    $response = Read-Host "  Stop and restart? (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Id $existingProcess.Id -Force
        Start-Sleep -Seconds 2
    } else {
        Write-Host "  Keeping existing backend running" -ForegroundColor Gray
        $skipBackendStart = $true
    }
}

if (-not $skipBackendStart) {
    # Start backend in new window
    Write-Host "  Starting backend server on port $BACKEND_PORT..." -ForegroundColor Gray
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$DEPLOY_PATH'; node backend-server.cjs" -WindowStyle Normal
    
    Start-Sleep -Seconds 3
    
    # Check if backend started
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "  [OK] Backend server started successfully" -ForegroundColor Green
    } catch {
        Write-Host "  [WARNING] Backend server started, but health check failed" -ForegroundColor Yellow
        Write-Host "  Check the backend window for errors" -ForegroundColor Yellow
    }
}

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
Write-Host "            Or serve via IIS/HTTP Server" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Test Login Credentials:" -ForegroundColor Cyan
Write-Host "   Username: 1111111111111" -ForegroundColor White
Write-Host "   Password: 123456" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Setup IIS to serve the dist/ folder" -ForegroundColor Yellow
Write-Host "      - Point IIS website to: $DEPLOY_PATH\dist" -ForegroundColor Gray
Write-Host "      - Configure reverse proxy for /api/ to http://localhost:$BACKEND_PORT" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Install backend as Windows Service (optional)" -ForegroundColor Yellow
Write-Host "      - Run: npm install -g node-windows" -ForegroundColor Gray
Write-Host "      - See SERVER-SETUP-FROM-SCRATCH.md for details" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Configure firewall" -ForegroundColor Yellow
Write-Host "      - Allow port 80 (HTTP) or 443 (HTTPS)" -ForegroundColor Gray
Write-Host "      - Allow port $BACKEND_PORT (Backend API)" -ForegroundColor Gray
Write-Host ""

Write-Host "[INFO] Documentation:" -ForegroundColor Cyan
Write-Host "   See SERVER-SETUP-FROM-SCRATCH.md for detailed setup" -ForegroundColor White
Write-Host "   See PRODUCTION-DEPLOYMENT.md for deployment details" -ForegroundColor White
Write-Host ""

Write-Host "[!] Important Notes:" -ForegroundColor Yellow
Write-Host "   - Backend is running in a separate PowerShell window" -ForegroundColor White
Write-Host "   - Don't close the backend window" -ForegroundColor White
Write-Host "   - To stop backend: Close the backend window or kill node.exe process" -ForegroundColor White
Write-Host "   - Database credentials are in: .env.sqlserver" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
