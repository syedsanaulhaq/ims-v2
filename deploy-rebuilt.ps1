# Deploy the newly built production bundle to Apache root
# This script should be run ON THE SERVER at 172.20.150.34

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  IMS Root Deployment (Rebuilt)" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$sourceDir = "E:\ECP-Projects\inventory-management-system-ims\ims-v1"
$htdocsDir = "C:\xampp\htdocs"
$distDir = "$sourceDir\dist"
$backupDir = "C:\xampp\htdocs-backups"

Write-Host "📁 Directories:" -ForegroundColor Yellow
Write-Host "  Source: $sourceDir"
Write-Host "  Dist: $distDir"
Write-Host "  Target: $htdocsDir"
Write-Host ""

# Step 1: Check if dist folder exists
if (-not (Test-Path $distDir)) {
    Write-Host "❌ Error: dist folder not found at $distDir" -ForegroundColor Red
    Write-Host "   Please run 'npm run build' first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dist folder found" -ForegroundColor Green

# Step 2: Create backup directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "📁 Created backup directory" -ForegroundColor Green
}

# Step 3: Backup existing htdocs
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$backupDir\htdocs-backup-$timestamp"

Write-Host ""
Write-Host "💾 Creating backup..." -ForegroundColor Yellow
if (Test-Path "$htdocsDir\*") {
    Copy-Item -Path $htdocsDir -Destination $backupPath -Recurse -Force
    Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No existing files to backup" -ForegroundColor Cyan
}

# Step 4: Clear htdocs directory
Write-Host ""
Write-Host "🧹 Clearing htdocs directory..." -ForegroundColor Yellow
Get-ChildItem -Path $htdocsDir -Recurse | Remove-Item -Force -Recurse
Write-Host "✅ Cleared htdocs" -ForegroundColor Green

# Step 5: Copy dist contents to htdocs
Write-Host ""
Write-Host "📦 Copying production build to htdocs..." -ForegroundColor Yellow
Copy-Item -Path "$distDir\*" -Destination $htdocsDir -Recurse -Force
Write-Host "✅ Copied dist to htdocs" -ForegroundColor Green

# Step 6: Create .htaccess for SPA routing
Write-Host ""
Write-Host "📝 Creating .htaccess..." -ForegroundColor Yellow

$htaccessContent = @"
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Don't rewrite API requests - let Apache proxy handle them
    RewriteCond %{REQUEST_URI} ^/api/ [NC]
    RewriteRule ^ - [L]
    
    # Don't rewrite files or directories that exist
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # Route everything else to index.html for SPA
    RewriteRule ^ index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
"@

Set-Content -Path "$htdocsDir\.htaccess" -Value $htaccessContent
Write-Host "✅ Created .htaccess" -ForegroundColor Green

# Step 7: Check if backend is running
Write-Host ""
Write-Host "🔍 Checking backend server..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend server is running (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend server is not responding" -ForegroundColor Red
    Write-Host "   Starting backend server..." -ForegroundColor Yellow
    
    $backendPath = "$sourceDir\backend-server.cjs"
    if (Test-Path $backendPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$sourceDir'; node backend-server.cjs" -WindowStyle Minimized
        Start-Sleep -Seconds 3
        Write-Host "✅ Backend server started" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend server file not found at $backendPath" -ForegroundColor Red
    }
}

# Step 8: Check Apache
Write-Host ""
Write-Host "🔍 Checking Apache..." -ForegroundColor Yellow

# Try to restart Apache
Write-Host "   Attempting to restart Apache..." -ForegroundColor Yellow

# Force kill any running Apache processes
Get-Process -Name "httpd" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Apache
try {
    & "C:\xampp\apache_start.bat"
    Start-Sleep -Seconds 3
    Write-Host "✅ Apache restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not restart Apache automatically" -ForegroundColor Yellow
    Write-Host "   Please restart Apache manually from XAMPP Control Panel" -ForegroundColor Yellow
}

# Step 9: Final verification
Write-Host ""
Write-Host "🧪 Verifying deployment..." -ForegroundColor Yellow

# Check if files exist
if (Test-Path "$htdocsDir\index.html") {
    Write-Host "✅ index.html exists" -ForegroundColor Green
} else {
    Write-Host "❌ index.html missing!" -ForegroundColor Red
}

if (Test-Path "$htdocsDir\.htaccess") {
    Write-Host "✅ .htaccess exists" -ForegroundColor Green
} else {
    Write-Host "❌ .htaccess missing!" -ForegroundColor Red
}

# List JavaScript files
$jsFiles = Get-ChildItem -Path "$htdocsDir\assets\*.js" -ErrorAction SilentlyContinue
if ($jsFiles) {
    Write-Host "✅ JavaScript files found:" -ForegroundColor Green
    foreach ($file in $jsFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "   - $($file.Name) ($sizeMB MB)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ No JavaScript files found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Application should now be available at:" -ForegroundColor Yellow
Write-Host "   http://172.20.150.34/" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open http://172.20.150.34/ in browser" -ForegroundColor White
Write-Host "   2. Check browser console for errors" -ForegroundColor White
Write-Host "   3. Verify API calls are working (should show '/api' in console)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Backup location: $backupPath" -ForegroundColor Cyan
Write-Host ""
