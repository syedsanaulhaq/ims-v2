# Start Production Backend Server
# This script starts the backend server for production deployment

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Starting Production Backend" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$sourceDir = "C:\ims-v1"

# Check if we're in the right directory
if (-not (Test-Path "backend-server.cjs")) {
    Write-Host "[ERROR] backend-server.cjs not found" -ForegroundColor Red
    Write-Host "   Please run this script from: $sourceDir" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if backend is already running
Write-Host ""
Write-Host "[*] Checking if backend is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -ErrorAction Stop -TimeoutSec 2
    Write-Host "[WARN] Backend is already running on port 3001" -ForegroundColor Yellow
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host ""
    $answer = Read-Host "Do you want to restart it? (Y/N)"
    if ($answer -ne "Y" -and $answer -ne "y") {
        Write-Host "[INFO] Keeping existing backend server" -ForegroundColor Cyan
        exit 0
    }
    
    # Kill existing Node processes
    Write-Host ""
    Write-Host "[*] Stopping existing backend..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*$sourceDir*" } | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "[OK] Existing backend stopped" -ForegroundColor Green
} catch {
    Write-Host "[OK] No backend running on port 3001" -ForegroundColor Green
}

# Start the backend server
Write-Host ""
Write-Host "[*] Starting backend server..." -ForegroundColor Yellow
Write-Host "   Environment: Production" -ForegroundColor Cyan
Write-Host "   Port: 3001" -ForegroundColor Cyan
Write-Host "   Database: InvMISDB" -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$sourceDir'; Write-Host 'Backend Server Starting...' -ForegroundColor Cyan; node backend-server.cjs" -WindowStyle Normal

# Wait for backend to start
Write-Host "[*] Waiting for backend to start..." -ForegroundColor Yellow
$maxAttempts = 10
$attempt = 0
$started = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -ErrorAction Stop -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $started = $true
            break
        }
    } catch {
        $attempt++
    }
}

if ($started) {
    Write-Host "[OK] Backend server started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "  Backend Ready!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backend API: http://localhost:3001/api" -ForegroundColor Cyan
    Write-Host "Health Check: http://localhost:3001/api/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[*] Backend is running in a separate window" -ForegroundColor Yellow
    Write-Host "[*] Do not close the backend window" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[ERROR] Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "   Please check the backend window for errors" -ForegroundColor Yellow
    exit 1
}
