# Fix mixed quotes - backtick starting but single/double quote ending
$sourceFiles = Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts,*.jsx,*.js
$filesFixed = 0
$patternsFixed = 0

foreach ($file in $sourceFiles) {
    try {
        $lines = Get-Content $file.FullName -Encoding UTF8
        $modified = $false
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            $originalLine = $line
            
            # Fix pattern: fetch(`/api... with single quote closure
            # Match: fetch(`...', and replace closing ' with `
            $line = $line -replace "fetch\((`[^`]+)',\s*\{", 'fetch($1`, {'
            
            # Fix pattern: fetch(`..."/api... with double quote closure  
            $line = $line -replace "fetch\((`[^`]+`")",\s*\{", 'fetch($1`, {'
            
            if ($line -ne $originalLine) {
                $lines[$i] = $line
                $modified = $true
                $patternsFixed++
                Write-Host "Fixed line $($i+1) in $($file.Name): $originalLine" -ForegroundColor Yellow
                Write-Host "  =>  $line" -ForegroundColor Green
            }
        }
        
        if ($modified) {
            [System.IO.File]::WriteAllLines($file.FullName, $lines, [System.Text.UTF8Encoding]::new($false))
            $filesFixed++
            Write-Host "Saved: $($file.FullName)" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Host "Error processing $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nTotal files fixed: $filesFixed" -ForegroundColor Cyan
Write-Host "Total patterns fixed: $patternsFixed" -ForegroundColor Cyan
