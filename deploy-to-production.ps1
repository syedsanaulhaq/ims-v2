# Deployment script for IMS production server
# Run this on the production server at C:\ims-v1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMS Production Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Pull latest changes
Write-Host "[1/4] Pulling latest changes from GitHub..." -ForegroundColor Yellow
git pull origin invmisdb-rebuild-sept14-2025

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git pull failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Git pull successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Install dependencies (if needed)
Write-Host "[2/4] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Dependencies already installed."
}
Write-Host ""

# Step 3: Build the application
Write-Host "[3/4] Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build successful!" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy to Apache htdocs
Write-Host "[4/4] Deploying to Apache..." -ForegroundColor Yellow

$sourceDir = "dist"
$targetDir = "C:\xampp\htdocs\ims"

# Backup existing deployment
if (Test-Path $targetDir) {
    $backupDir = "C:\xampp\htdocs\ims_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "Creating backup at: $backupDir"
    Copy-Item -Path $targetDir -Destination $backupDir -Recurse -Force
}

# Create target directory if it doesn't exist
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# Copy build files
Write-Host "Copying files from $sourceDir to $targetDir..."
Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force

Write-Host "✓ Deployment complete!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Application URL: http://localhost/ims/" -ForegroundColor White
Write-Host "API Endpoint: /ims/api (proxied to localhost:3001)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure backend is running on localhost:3001" -ForegroundColor White
Write-Host "2. Test the application in a browser" -ForegroundColor White
Write-Host "3. Check browser console for any CORS errors" -ForegroundColor White
Write-Host ""
