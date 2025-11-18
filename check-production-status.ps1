# Check Production Status
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "IMS Production Status Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Frontend Deployment
Write-Host "[Frontend Deployment]" -ForegroundColor Yellow
if (Test-Path "C:\xampp\htdocs\ims\index.html") {
    $lastWrite = (Get-Item "C:\xampp\htdocs\ims\index.html").LastWriteTime
    Write-Host "  Status: DEPLOYED" -ForegroundColor Green
    Write-Host "  Location: C:\xampp\htdocs\ims" -ForegroundColor Gray
    Write-Host "  Last Updated: $lastWrite" -ForegroundColor Gray
} else {
    Write-Host "  Status: NOT DEPLOYED" -ForegroundColor Red
}

# Check Apache
Write-Host "`n[Apache Server]" -ForegroundColor Yellow
$apache = Get-Process -Name httpd -ErrorAction SilentlyContinue
if ($apache) {
    $apacheCount = ($apache | Measure-Object).Count
    Write-Host "  Status: RUNNING ($apacheCount processes)" -ForegroundColor Green
    $port80 = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
    if ($port80) {
        Write-Host "  Port 80: LISTENING" -ForegroundColor Green
    }
} else {
    Write-Host "  Status: NOT RUNNING" -ForegroundColor Red
}

# Check Backend
Write-Host "`n[Backend Server]" -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($port3001) {
    $processId = $port3001.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "  Status: RUNNING" -ForegroundColor Green
        Write-Host "  Process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Gray
        Write-Host "  Port 3001: LISTENING" -ForegroundColor Green
    }
} else {
    Write-Host "  Status: NOT RUNNING" -ForegroundColor Red
    Write-Host "  Port 3001: NOT LISTENING" -ForegroundColor Red
}

# Check SQL Server
Write-Host "`n[SQL Server]" -ForegroundColor Yellow
$sqlserver = Get-Service -Name MSSQLSERVER -ErrorAction SilentlyContinue
if ($sqlserver) {
    if ($sqlserver.Status -eq 'Running') {
        Write-Host "  Status: RUNNING" -ForegroundColor Green
    } else {
        Write-Host "  Status: $($sqlserver.Status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status: NOT FOUND" -ForegroundColor Red
}

# Application URLs
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Application URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Local:    http://localhost/ims" -ForegroundColor White
Write-Host "Network:  http://172.20.150.34/ims" -ForegroundColor White
Write-Host "`nAPI Endpoint: /ims/api (proxied to localhost:3001)" -ForegroundColor Gray
Write-Host "`n"
