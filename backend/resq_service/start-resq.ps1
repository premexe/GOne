# Starts the standalone G-ONE ResQ voice companion on port 8001.
# Run this script from the repository root: .\backend\resq_service\start-resq.ps1

$ErrorActionPreference = 'Stop'
$ServiceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ServiceRoot)
$Python = Join-Path $ProjectRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Python environment not found at $Python. Create it from the project root with: python -m venv .venv"
}

if (-not (Test-Path -LiteralPath (Join-Path $ServiceRoot '.env'))) {
    Write-Warning 'No backend/resq_service/.env found. The deterministic safety fallback will run, but Gemini/Groq/Sarvam are disabled.'
    Write-Host 'Create it with: Copy-Item .env.example .env' -ForegroundColor Yellow
}

Set-Location $ServiceRoot
& $Python -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
