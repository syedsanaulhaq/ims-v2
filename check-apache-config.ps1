# ====================================================================
# Apache Configuration for IMS Root Deployment
# ====================================================================
# Run this on the server to ensure Apache is configured correctly
# ====================================================================

Write-Host "Checking Apache Configuration..." -ForegroundColor Cyan
Write-Host ""

$apacheConfPath = "C:\xampp\apache\conf\httpd.conf"
$htdocsPath = "C:\xampp\htdocs"

# Check if required modules are enabled
Write-Host "1. Checking Apache modules..." -ForegroundColor Yellow

$requiredModules = @(
    "mod_rewrite.so",
    "mod_proxy.so",
    "mod_proxy_http.so"
)

$confContent = Get-Content $apacheConfPath -Raw

$allEnabled = $true
foreach ($module in $requiredModules) {
    if ($confContent -match "^\s*LoadModule.*$module" -and $confContent -notmatch "^\s*#.*LoadModule.*$module") {
        Write-Host "   ✓ $module is enabled" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $module is NOT enabled" -ForegroundColor Red
        $allEnabled = $false
    }
}

if (-not $allEnabled) {
    Write-Host ""
    Write-Host "Please enable required modules in httpd.conf:" -ForegroundColor Yellow
    Write-Host "   Uncomment these lines:" -ForegroundColor Gray
    foreach ($module in $requiredModules) {
        Write-Host "   LoadModule $(($module -replace '.so','').PadRight(30)) modules/$module" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "2. Checking .htaccess support..." -ForegroundColor Yellow

if ($confContent -match "AllowOverride\s+All") {
    Write-Host "   ✓ AllowOverride All is enabled" -ForegroundColor Green
} else {
    Write-Host "   ✗ AllowOverride might not be set to 'All'" -ForegroundColor Red
    Write-Host "   Ensure this in <Directory> section for htdocs:" -ForegroundColor Yellow
    Write-Host "   AllowOverride All" -ForegroundColor Gray
}

Write-Host ""
Write-Host "3. DocumentRoot configuration..." -ForegroundColor Yellow
if ($confContent -match "DocumentRoot\s+`"C:/xampp/htdocs`"") {
    Write-Host "   ✓ DocumentRoot is C:/xampp/htdocs" -ForegroundColor Green
} else {
    Write-Host "   ⚠ DocumentRoot might not be set correctly" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "4. .htaccess file check..." -ForegroundColor Yellow
if (Test-Path "$htdocsPath\.htaccess") {
    Write-Host "   ✓ .htaccess exists in htdocs" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Content:" -ForegroundColor Gray
    Get-Content "$htdocsPath\.htaccess" | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
} else {
    Write-Host "   ✗ .htaccess NOT found" -ForegroundColor Red
    Write-Host "   Run deploy-to-root.ps1 to create it" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "5. Backend server status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✓ Backend is running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend NOT responding on port 3001" -ForegroundColor Red
    Write-Host "   Start it with: node backend-server.cjs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Check Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($allEnabled) {
    Write-Host "✓ Apache is configured correctly for root deployment" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run: .\deploy-to-root.ps1" -ForegroundColor Gray
    Write-Host "2. Access: http://172.20.150.34/" -ForegroundColor Gray
} else {
    Write-Host "⚠ Please fix Apache configuration issues above" -ForegroundColor Yellow
}
Write-Host ""
