# Restart Apache Properly
Write-Host "`n[RESTART] Restarting Apache Server..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Check if Apache is running
Write-Host "`n1. Checking if Apache is running..." -ForegroundColor Yellow
$apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue

if ($apacheProcess) {
    Write-Host "  [WARN] Apache is running (PID: $($apacheProcess[0].Id))" -ForegroundColor Yellow
    Write-Host "  Stopping Apache..." -ForegroundColor Yellow
    
    # Kill all httpd processes
    $apacheProcess | ForEach-Object { 
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped process $($_.Id)" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Apache stopped" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Apache is not running" -ForegroundColor Cyan
}

# Start Apache
Write-Host "`n2. Starting Apache..." -ForegroundColor Yellow
$apacheExe = "C:\xampp\apache\bin\httpd.exe"

if (Test-Path $apacheExe) {
    try {
        Start-Process -FilePath $apacheExe -WindowStyle Hidden -ErrorAction Stop
        Start-Sleep -Seconds 3
        
        # Check if started successfully
        $newProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
        if ($newProcess) {
            Write-Host "  [OK] Apache started successfully (PID: $($newProcess[0].Id))" -ForegroundColor Green
            
            # Test if port 80 is listening
            Write-Host "`n3. Testing Apache on port 80..." -ForegroundColor Yellow
            try {
                $testResponse = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                Write-Host "  [OK] Apache responding on port 80" -ForegroundColor Green
            } catch {
                Write-Host "  [WARN] Apache process running but not responding on port 80" -ForegroundColor Yellow
                Write-Host "  This might be normal during startup" -ForegroundColor Gray
            }
        } else {
            Write-Host "  [ERROR] Apache failed to start" -ForegroundColor Red
            Write-Host "  Check C:\xampp\apache\logs\error.log for details" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [ERROR] Error starting Apache: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  [ERROR] Apache executable not found at $apacheExe" -ForegroundColor Red
}

# Check error log for recent issues
Write-Host "`n4. Checking Apache error log..." -ForegroundColor Yellow
$errorLog = "C:\xampp\apache\logs\error.log"
if (Test-Path $errorLog) {
    $recentErrors = Get-Content $errorLog -Tail 10
    if ($recentErrors) {
        Write-Host "  Recent log entries:" -ForegroundColor Gray
        $recentErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "[SUCCESS] Apache restart complete!" -ForegroundColor Green
Write-Host ""
