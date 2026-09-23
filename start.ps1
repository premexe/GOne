# GOne / LifeLink - Start Script
# Usage: .\start.ps1
# What it does:
#   1. Starts the FastAPI backend on port 8000
#   2. Starts ngrok tunnel on port 8000 (if ngrok is installed)
#   3. Auto-updates backend/.env with the fresh ngrok HTTPS URL
#   4. Restarts the backend so voice calls pick up the new URL
#
# Run from the project root:  cd C:\Users\Admin\OneDrive\Desktop\GOne; .\start.ps1

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot
$BackendDir  = Join-Path $ProjectRoot "backend"
$EnvFile     = Join-Path $BackendDir ".env"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  LifeLink AI - Full Stack Launcher" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kill any existing server on port 8000
Write-Host "[1/4] Freeing port 8000..." -ForegroundColor Yellow
try {
    $procs = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($pid in ($procs | Sort-Object -Unique)) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
} catch {}
Start-Sleep -Seconds 1

# 2. Start backend
Write-Host "[2/4] Starting FastAPI backend on port 8000..." -ForegroundColor Yellow
Push-Location $BackendDir
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 2>&1
} -ArgumentList $BackendDir
Pop-Location

# Wait for backend to be ready. Migrations can take longer on first startup.
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
if ($ready) {
    Write-Host "  Backend is running at http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "  Backend failed to start. Check backend logs." -ForegroundColor Red
    Receive-Job $backendJob
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

# 3. Start ngrok (optional)
Write-Host "[3/4] Starting ngrok tunnel (for Twilio webhooks)..." -ForegroundColor Yellow

$ngrokPath = $null
$possiblePaths = @(
    "ngrok",
    "$env:USERPROFILE\ngrok.exe",
    "$env:USERPROFILE\Downloads\ngrok.exe",
    "C:\ngrok\ngrok.exe",
    "C:\tools\ngrok.exe"
)
foreach ($p in $possiblePaths) {
    if (Get-Command $p -ErrorAction SilentlyContinue) {
        $ngrokPath = $p
        break
    }
}

if ($ngrokPath) {
    # Start ngrok in background
    $ngrokJob = Start-Job -ScriptBlock {
        param($ngrok)
        & $ngrok http 8000 2>&1
    } -ArgumentList $ngrokPath

    # Wait for ngrok to emit its URL (poll the ngrok local API)
    $ngrokUrl = $null
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        try {
            $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
            $https = $tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
            if ($https) {
                $ngrokUrl = $https.public_url
                break
            }
        } catch {}
    }

    if ($ngrokUrl) {
        Write-Host "  ngrok tunnel: $ngrokUrl" -ForegroundColor Green

        # Update backend/.env with new ngrok URL
        $envContent = Get-Content $EnvFile -Raw
        if ($envContent -match "PUBLIC_BACKEND_URL=.*") {
            $envContent = $envContent -replace "PUBLIC_BACKEND_URL=.*", "PUBLIC_BACKEND_URL=$ngrokUrl"
        } else {
            $envContent += "`nPUBLIC_BACKEND_URL=$ngrokUrl"
        }
        Set-Content $EnvFile $envContent -NoNewline
        Write-Host "  Updated backend/.env -> PUBLIC_BACKEND_URL=$ngrokUrl" -ForegroundColor Green

        Write-Host ""
        Write-Host "  Twilio webhook URL: $ngrokUrl/voice/call-twiml/{sos_id}" -ForegroundColor Cyan
        Write-Host "  Voice calls will work when ENABLE_SOS_VOICE_CALLS=true" -ForegroundColor Cyan
    } else {
        Write-Host "  ngrok started but could not detect tunnel URL." -ForegroundColor Yellow
        Write-Host "    Open http://localhost:4040 to see the URL, then update backend/.env manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ngrok is NOT installed. Twilio webhooks require a public HTTPS URL." -ForegroundColor Yellow
    Write-Host "    Install ngrok: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "    After installing, run:  ngrok http 8000" -ForegroundColor Yellow
    Write-Host "    Then update backend/.env: PUBLIC_BACKEND_URL=<your-ngrok-url>" -ForegroundColor Yellow
}

# 4. Summary
Write-Host ""
Write-Host "[4/4] System Status" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Backend API:    http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:       http://localhost:8000/docs" -ForegroundColor White
if ($ngrokUrl) {
    Write-Host "  ngrok (public): $ngrokUrl" -ForegroundColor White
}
Write-Host ""
Write-Host "  Frontend: cd frontend; npx expo start" -ForegroundColor White
Write-Host ""
Write-Host "  To enable SOS voice calls, ensure in backend/.env:" -ForegroundColor Yellow
Write-Host "    ENABLE_SOS_VOICE_CALLS=true" -ForegroundColor Yellow
Write-Host "    PUBLIC_BACKEND_URL=<your-ngrok-https-url>" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan

# Keep running and stream backend logs
try {
    while ($true) {
        $output = Receive-Job $backendJob
        if ($output) { Write-Host $output }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    if ($ngrokJob) {
        Stop-Job $ngrokJob -ErrorAction SilentlyContinue
        Remove-Job $ngrokJob -ErrorAction SilentlyContinue
    }
}
