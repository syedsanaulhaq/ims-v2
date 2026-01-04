#!/usr/bin/env powershell

# ============================================================================
# IMS Testing Stage Automated Deployment Script
# ============================================================================

param(
    [string]$TestingPath = "C:\ims-testing",
    [string]$ServerName = "SYED-FAZLI-LAPT",
    [string]$Database = "InventoryManagementDB",
    [string]$SqlUser = "inventorymanagementuser",
    [string]$SqlPassword = "2016Wfp61@"
)

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "IMS Testing Stage Deployment" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Testing Directory
Write-Host "Step 1: Creating/Verifying testing directory..." -ForegroundColor Yellow
if (-not (Test-Path $TestingPath)) {
    New-Item -ItemType Directory -Path $TestingPath | Out-Null
    Write-Host "✓ Created directory: $TestingPath" -ForegroundColor Green
}
else {
    Write-Host "✓ Directory exists: $TestingPath" -ForegroundColor Green
}

# Step 2: Clone or Copy Code
Write-Host ""
Write-Host "Step 2: Checking out latest code..." -ForegroundColor Yellow

if (Test-Path "$TestingPath\.git") {
    Write-Host "Git repository found, pulling latest code..." -ForegroundColor Cyan
    cd $TestingPath
    git fetch origin
    git checkout stable-nov11-production
    git pull origin stable-nov11-production
    Write-Host "✓ Code updated" -ForegroundColor Green
}
else {
    Write-Host "No git repository found. Please clone the repository first:" -ForegroundColor Red
    Write-Host "  git clone https://github.com/syedsanaulhaq/ims-v2.git $TestingPath" -ForegroundColor Yellow
    exit 1
}

# Step 3: Install Dependencies
Write-Host ""
Write-Host "Step 3: Installing npm dependencies..." -ForegroundColor Yellow
cd $TestingPath

if (Test-Path "package.json") {
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    }
    else {
        Write-Host "✗ npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Verify .env file
Write-Host ""
Write-Host "Step 4: Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path "$TestingPath\.env")) {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    $envContent = @"
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_ENV=testing
"@
    Set-Content -Path "$TestingPath\.env" -Value $envContent
    Write-Host "✓ .env file created" -ForegroundColor Green
}
else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

# Step 5: Restore Database
Write-Host ""
Write-Host "Step 5: Restoring database..." -ForegroundColor Yellow

$sqlScriptPath = "$TestingPath\restore-database-production.sql"

if (Test-Path $sqlScriptPath) {
    Write-Host "Running SQL restoration script..." -ForegroundColor Cyan
    
    try {
        $sqlScript = Get-Content $sqlScriptPath -Raw
        $batches = $sqlScript -split "^\s*GO\s*$" -Options Multiline
        
        $sqlConnection = New-Object System.Data.SqlClient.SqlConnection
        $sqlConnection.ConnectionString = "Server=$ServerName;Database=$Database;User Id=$SqlUser;Password=$SqlPassword;"
        $sqlConnection.Open()
        
        $batchCount = 0
        foreach ($batch in $batches) {
            if ($batch.Trim() -ne "") {
                $sqlCommand = New-Object System.Data.SqlClient.SqlCommand
                $sqlCommand.Connection = $sqlConnection
                $sqlCommand.CommandText = $batch
                $sqlCommand.CommandTimeout = 300
                $sqlCommand.ExecuteNonQuery() | Out-Null
                $batchCount++
            }
        }
        
        $sqlConnection.Close()
        Write-Host "✓ Database restored ($batchCount batches executed)" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Database restoration failed: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "✗ SQL script not found: $sqlScriptPath" -ForegroundColor Red
    exit 1
}

# Step 6: Build
Write-Host ""
Write-Host "Step 6: Building application..." -ForegroundColor Yellow
cd $TestingPath

npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build successful" -ForegroundColor Green
}
else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
Write-Host "TESTING STAGE DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Testing environment ready at: $TestingPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start testing server, run:" -ForegroundColor Yellow
Write-Host "  cd $TestingPath" -ForegroundColor White
Write-Host "  npm run staging:start" -ForegroundColor White
Write-Host ""
Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing Checklist:" -ForegroundColor Yellow
Write-Host "  [ ] Frontend loads" -ForegroundColor White
Write-Host "  [ ] Can login" -ForegroundColor White
Write-Host "  [ ] Create individual request" -ForegroundColor White
Write-Host "  [ ] Create wing request" -ForegroundColor White
Write-Host "  [ ] Wing HOD sees approval" -ForegroundColor White
Write-Host "  [ ] Can approve/reject items" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
