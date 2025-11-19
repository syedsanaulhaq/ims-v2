# Deploy IMS to Production Server
# Server: 172.20.150.34
# Path: C:\xampp\htdocs\ims

$ServerIP = "172.20.150.34"
$DestPath = "\\$ServerIP\c$\xampp\htdocs\ims"
$SourcePath = ".\dist"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying IMS to Production Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server: $ServerIP" -ForegroundColor Yellow
Write-Host "Source: $SourcePath" -ForegroundColor Yellow
Write-Host "Destination: $DestPath" -ForegroundColor Yellow
Write-Host ""

# Check if dist folder exists
if (!(Test-Path $SourcePath)) {
    Write-Host "ERROR: dist folder not found. Run 'npm run build' first!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting deployment..." -ForegroundColor Green
Write-Host ""

# Use robocopy to mirror the dist folder to the server
# /MIR = Mirror (delete files in destination that don't exist in source)
# /R:2 = Retry 2 times on failed copies
# /W:5 = Wait 5 seconds between retries
# /NP = No progress (cleaner output)
# /NDL = No directory list
# /NFL = No file list (comment this out if you want to see each file)

robocopy $SourcePath $DestPath /MIR /R:2 /W:5 /NP /NDL

# Robocopy exit codes: 0-7 are success, 8+ are errors
if ($LASTEXITCODE -ge 8) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "DEPLOYMENT FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "1. Check network connectivity to $ServerIP" -ForegroundColor Yellow
    Write-Host "2. Verify you have admin credentials for the server" -ForegroundColor Yellow
    Write-Host "3. Ensure the destination path exists: C:\xampp\htdocs\ims" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You may need to run: net use \\$ServerIP\c$ /user:Administrator" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URL: http://$ServerIP/ims/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor Yellow
    Write-Host "2. Open in incognito/private window" -ForegroundColor Yellow
    Write-Host "3. Check browser console (F12) for any errors" -ForegroundColor Yellow
    Write-Host ""
}
