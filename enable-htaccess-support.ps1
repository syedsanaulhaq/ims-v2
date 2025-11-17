# Enable AllowOverride for .htaccess support
Write-Host "`n🔧 Enabling .htaccess Support in Apache..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$httpdConf = "C:\xampp\apache\conf\httpd.conf"
$backupPath = "C:\xampp\apache\conf\httpd.conf.backup-" + (Get-Date -Format "yyyyMMdd-HHmmss")

# Backup httpd.conf
Write-Host "`n📋 Creating backup..." -ForegroundColor Yellow
Copy-Item $httpdConf $backupPath
Write-Host "  ✅ Backup created: $backupPath" -ForegroundColor Green

# Read httpd.conf
$content = Get-Content $httpdConf -Raw

# Check current AllowOverride settings
Write-Host "`n🔍 Checking current AllowOverride settings..." -ForegroundColor Yellow
$lines = Get-Content $httpdConf
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '<Directory "C:/xampp/htdocs">') {
        Write-Host "  Found htdocs Directory block at line $($i+1)" -ForegroundColor Cyan
        
        # Look for AllowOverride in next 20 lines
        $found = $false
        for ($j = $i; $j -lt [Math]::Min($i + 20, $lines.Count); $j++) {
            if ($lines[$j] -match '^\s*AllowOverride\s+(.+)') {
                $currentValue = $matches[1]
                Write-Host "  Current setting: AllowOverride $currentValue" -ForegroundColor Yellow
                
                if ($currentValue -eq "All") {
                    Write-Host "  ✅ AllowOverride already set to All" -ForegroundColor Green
                    $found = $true
                    break
                } else {
                    Write-Host "  ⚠️ Changing to 'AllowOverride All'" -ForegroundColor Yellow
                    $lines[$j] = "    AllowOverride All"
                    $found = $true
                    break
                }
            }
        }
        
        if (-not $found) {
            Write-Host "  ⚠️ No AllowOverride found, adding it" -ForegroundColor Yellow
            # Find the end of Directory block and add before it
            for ($k = $i; $k -lt [Math]::Min($i + 20, $lines.Count); $k++) {
                if ($lines[$k] -match '</Directory>') {
                    # Insert before </Directory>
                    $lines = $lines[0..($k-1)] + "    AllowOverride All" + $lines[$k..($lines.Count-1)]
                    break
                }
            }
        }
        break
    }
}

# Save modified httpd.conf
Write-Host "`n💾 Saving changes..." -ForegroundColor Yellow
$lines | Set-Content $httpdConf -Encoding UTF8
Write-Host "  ✅ httpd.conf updated" -ForegroundColor Green

# Also check for LoadModule rewrite_module
Write-Host "`n🔍 Checking mod_rewrite..." -ForegroundColor Yellow
$rewriteLine = Get-Content $httpdConf | Select-String "LoadModule rewrite_module"
if ($rewriteLine -match "^#") {
    Write-Host "  ⚠️ mod_rewrite is commented out, enabling..." -ForegroundColor Yellow
    $content = Get-Content $httpdConf -Raw
    $content = $content -replace '#LoadModule rewrite_module', 'LoadModule rewrite_module'
    Set-Content $httpdConf -Value $content
    Write-Host "  ✅ mod_rewrite enabled" -ForegroundColor Green
} else {
    Write-Host "  ✅ mod_rewrite already enabled" -ForegroundColor Green
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "✅ Configuration Updated!" -ForegroundColor Green
Write-Host "`n⚠️ IMPORTANT: You must restart Apache for changes to take effect:" -ForegroundColor Yellow
Write-Host "  1. Stop Apache: C:\xampp\apache_stop.bat" -ForegroundColor Cyan
Write-Host "  2. Start Apache: C:\xampp\apache_start.bat" -ForegroundColor Cyan
Write-Host "`nOr use XAMPP Control Panel to restart Apache" -ForegroundColor Gray
Write-Host ""
