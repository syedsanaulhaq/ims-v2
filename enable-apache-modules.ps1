# ====================================================================
# Enable Required Apache Modules
# ====================================================================
# Run as Administrator to modify httpd.conf
# ====================================================================

Write-Host "Enabling Apache Modules..." -ForegroundColor Cyan
Write-Host ""

$apacheConfPath = "C:\xampp\apache\conf\httpd.conf"

# Check if file exists
if (-not (Test-Path $apacheConfPath)) {
    Write-Host "Error: httpd.conf not found at $apacheConfPath" -ForegroundColor Red
    exit 1
}

# Backup the file first
$backupPath = "$apacheConfPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $apacheConfPath $backupPath
Write-Host "Backup created: $backupPath" -ForegroundColor Green
Write-Host ""

# Read the configuration
$content = Get-Content $apacheConfPath

# Modules to enable
$modulesToEnable = @(
    "mod_rewrite.so",
    "mod_proxy.so",
    "mod_proxy_http.so"
)

$modified = $false

foreach ($module in $modulesToEnable) {
    $modulePattern = "LoadModule.*$module"
    $commentedPattern = "^\s*#\s*LoadModule.*$module"
    
    # Check if module line exists and is commented
    $lineIndex = 0
    $found = $false
    
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match $commentedPattern) {
            # Uncomment the line
            $content[$i] = $content[$i] -replace "^\s*#\s*", ""
            Write-Host "Enabled: $module" -ForegroundColor Green
            $modified = $true
            $found = $true
            break
        } elseif ($content[$i] -match $modulePattern -and $content[$i] -notmatch "^\s*#") {
            Write-Host "Already enabled: $module" -ForegroundColor Gray
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Host "Warning: $module not found in httpd.conf" -ForegroundColor Yellow
    }
}

if ($modified) {
    # Save the modified configuration
    Set-Content -Path $apacheConfPath -Value $content -Encoding UTF8
    Write-Host ""
    Write-Host "Configuration updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart Apache for changes to take effect" -ForegroundColor Gray
    Write-Host "2. Run: .\check-apache-config.ps1 to verify" -ForegroundColor Gray
    Write-Host "3. Run: .\deploy-to-root.ps1 to deploy" -ForegroundColor Gray
    Write-Host ""
    
    # Offer to restart Apache
    $restart = Read-Host "Restart Apache now? (Y/N)"
    if ($restart -eq "Y" -or $restart -eq "y") {
        Write-Host ""
        Write-Host "Restarting Apache..." -ForegroundColor Yellow
        
        # Try to restart via service
        $apacheService = Get-Service -Name "Apache*" -ErrorAction SilentlyContinue
        if ($apacheService) {
            Restart-Service -Name $apacheService.Name -Force
            Write-Host "Apache restarted successfully!" -ForegroundColor Green
        } else {
            Write-Host "Please restart Apache manually:" -ForegroundColor Yellow
            Write-Host "  C:\xampp\apache_stop.bat" -ForegroundColor Gray
            Write-Host "  C:\xampp\apache_start.bat" -ForegroundColor Gray
        }
    }
} else {
    Write-Host ""
    Write-Host "No changes needed - all modules already enabled" -ForegroundColor Green
}

Write-Host ""
