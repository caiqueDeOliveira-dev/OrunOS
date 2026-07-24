$projectDir = "C:\Users\Caiqu\OneDrive\Desktop\orun-os\orun_project"

# Start Vite in background
$vite = Start-Process -FilePath "npx" -ArgumentList "vite","--host","--port","5173" -WorkingDirectory $projectDir -PassThru -WindowStyle Hidden

# Wait for Vite to be ready
$maxWait = 30
for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing
        if ($r.StatusCode -eq 200) { break }
    } catch {}
}

# Start Electron
$electronExe = Join-Path $projectDir "node_modules\electron\dist\electron.exe"
& $electronExe $projectDir
