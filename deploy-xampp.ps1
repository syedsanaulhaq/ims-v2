# ============================================================================
# IMS XAMPP Deployment Script
# ============================================================================
# This script deploys the IMS application to XAMPP Apache server
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMS XAMPP Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$IMS_SOURCE = "C:\ims-v1"
$XAMPP_PATH = "C:\xampp"
$HTDOCS_PATH = "$XAMPP_PATH\htdocs\ims"
$APACHE_CONF = "$XAMPP_PATH\apache\conf\httpd.conf"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Source: $IMS_SOURCE" -ForegroundColor Gray
Write-Host "  XAMPP: $XAMPP_PATH" -ForegroundColor Gray
Write-Host "  Deployment: $HTDOCS_PATH" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# Step 1: Check if XAMPP is installed
# ============================================================================
Write-Host "[1/6] Checking XAMPP installation..." -ForegroundColor Cyan

if (!(Test-Path $XAMPP_PATH)) {
    Write-Host "  [ERROR] XAMPP not found at $XAMPP_PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install XAMPP or update the XAMPP_PATH variable in this script" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (!(Test-Path "$XAMPP_PATH\apache\bin\httpd.exe")) {
    Write-Host "  [ERROR] Apache not found in XAMPP installation" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  [OK] XAMPP found at $XAMPP_PATH" -ForegroundColor Green

# ============================================================================
# Step 2: Check if dist folder exists
# ============================================================================
Write-Host ""
Write-Host "[2/6] Checking build files..." -ForegroundColor Cyan

if (!(Test-Path "$IMS_SOURCE\dist")) {
    Write-Host "  [ERROR] dist folder not found!" -ForegroundColor Red
    Write-Host "  Please build the frontend first:" -ForegroundColor Yellow
    Write-Host "    cd $IMS_SOURCE" -ForegroundColor Gray
    Write-Host "    npm run build" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  [OK] Build files found in dist/" -ForegroundColor Green
$distSize = (Get-ChildItem -Path "$IMS_SOURCE\dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  [INFO] Size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray

# ============================================================================
# Step 3: Copy files to XAMPP htdocs
# ============================================================================
Write-Host ""
Write-Host "[3/6] Copying files to XAMPP..." -ForegroundColor Cyan

# Create ims folder if it doesn't exist
if (!(Test-Path $HTDOCS_PATH)) {
    New-Item -ItemType Directory -Path $HTDOCS_PATH -Force | Out-Null
    Write-Host "  [OK] Created directory: $HTDOCS_PATH" -ForegroundColor Green
}

# Copy dist files
try {
    Copy-Item -Path "$IMS_SOURCE\dist\*" -Destination $HTDOCS_PATH -Recurse -Force
    Write-Host "  [OK] Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to copy files: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 4: Create .htaccess for routing and API proxy
# ============================================================================
Write-Host ""
Write-Host "[4/6] Creating .htaccess configuration..." -ForegroundColor Cyan

$htaccess = @"
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /ims/
  
  # Proxy API requests to backend Node.js server
  RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
  
  # React Router - send all non-file requests to index.html
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /ims/index.html [L]
</IfModule>
"@

$htaccess | Out-File -FilePath "$HTDOCS_PATH\.htaccess" -Encoding UTF8
Write-Host "  [OK] .htaccess created with proxy configuration" -ForegroundColor Green

# ============================================================================
# Step 5: Enable Apache modules
# ============================================================================
Write-Host ""
Write-Host "[5/6] Checking Apache modules..." -ForegroundColor Cyan

if (Test-Path $APACHE_CONF) {
    $apacheConf = Get-Content $APACHE_CONF
    
    $modulesToEnable = @(
        "LoadModule proxy_module modules/mod_proxy.so",
        "LoadModule proxy_http_module modules/mod_proxy_http.so",
        "LoadModule rewrite_module modules/mod_rewrite.so"
    )
    
    $needsUpdate = $false
    $updatedConf = $apacheConf
    
    foreach ($module in $modulesToEnable) {
        $modulePattern = $module.Replace("LoadModule", "#*LoadModule")
        if ($apacheConf -match "#$module") {
            Write-Host "  [INFO] Enabling: $module" -ForegroundColor Yellow
            $updatedConf = $updatedConf -replace "#$module", $module
            $needsUpdate = $true
        }
    }
    
    if ($needsUpdate) {
        try {
            $updatedConf | Out-File -FilePath $APACHE_CONF -Encoding UTF8
            Write-Host "  [OK] Apache modules enabled" -ForegroundColor Green
            Write-Host "  [INFO] You need to restart Apache for changes to take effect" -ForegroundColor Yellow
        } catch {
            Write-Host "  [WARNING] Could not update httpd.conf automatically" -ForegroundColor Yellow
            Write-Host "  Please manually uncomment these lines in ${APACHE_CONF}:" -ForegroundColor Yellow
            foreach ($module in $modulesToEnable) {
                Write-Host "    $module" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  [OK] Required modules already enabled" -ForegroundColor Green
    }
} else {
    Write-Host "  [WARNING] Could not find httpd.conf" -ForegroundColor Yellow
}

# ============================================================================
# Step 6: Check backend server
# ============================================================================
Write-Host ""
Write-Host "[6/6] Checking backend server..." -ForegroundColor Cyan

$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
    $backendRunning = $true
    Write-Host "  [OK] Backend server is running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "  [WARNING] Backend server is not running" -ForegroundColor Yellow
    Write-Host "  You need to start it manually:" -ForegroundColor Yellow
    Write-Host "    cd $IMS_SOURCE" -ForegroundColor Gray
    Write-Host "    node backend-server.cjs" -ForegroundColor Gray
}

# ============================================================================
# Deployment Summary
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] XAMPP DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "[INFO] Deployment Location:" -ForegroundColor Cyan
Write-Host "   $HTDOCS_PATH" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Access URL:" -ForegroundColor Cyan
Write-Host "   http://localhost/ims" -ForegroundColor White
Write-Host "   Or: http://your-server-ip/ims" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Login Credentials:" -ForegroundColor Cyan
Write-Host "   Username: 1111111111111" -ForegroundColor White
Write-Host "   Password: 123456" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start XAMPP Control Panel" -ForegroundColor Yellow
Write-Host "   2. Start Apache service" -ForegroundColor Yellow

if (!$backendRunning) {
    Write-Host "   3. Start backend server:" -ForegroundColor Yellow
    Write-Host "      cd $IMS_SOURCE" -ForegroundColor Gray
    Write-Host "      node backend-server.cjs" -ForegroundColor Gray
} else {
    Write-Host "   3. Backend is already running" -ForegroundColor Green
}

Write-Host "   4. Open browser: http://localhost/ims" -ForegroundColor Yellow
Write-Host ""

Write-Host "[!] Important Notes:" -ForegroundColor Yellow
Write-Host "   - Apache must be running from XAMPP Control Panel" -ForegroundColor White
Write-Host "   - Backend must be running on port 3001" -ForegroundColor White
Write-Host "   - Database connection is configured in .env.sqlserver" -ForegroundColor White
Write-Host "   - API requests are proxied through Apache to backend" -ForegroundColor White
Write-Host ""

# Option to start XAMPP Control Panel
$response = Read-Host "Open XAMPP Control Panel now? (y/n)"
if ($response -eq 'y') {
    if (Test-Path "$XAMPP_PATH\xampp-control.exe") {
        Start-Process "$XAMPP_PATH\xampp-control.exe"
        Write-Host "  [OK] XAMPP Control Panel opened" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] XAMPP Control Panel not found" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
