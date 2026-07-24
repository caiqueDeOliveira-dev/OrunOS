# Orun OS — Start Whisper STT Server
# Run this script before using voice transcription in the app.
# First run downloads the model (~150MB).

param(
    [int]$Port = 8080,
    [string]$Model = "base"
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  Orun OS — Whisper STT Server" -ForegroundColor Red
Write-Host "  Model: $Model | Port: $Port" -ForegroundColor DarkGray
Write-Host ""

# Check Python
try {
    $pyVer = python --version 2>&1
    Write-Host "  [ok] $pyVer" -ForegroundColor Green
} catch {
    Write-Host "  [erro] Python nao encontrado. Instale: https://python.org" -ForegroundColor Red
    exit 1
}

# Check faster-whisper
$fwCheck = pip show faster-whisper 2>&1
if ($fwCheck -match "Name: faster-whisper") {
    Write-Host "  [ok] faster-whisper instalado" -ForegroundColor Green
} else {
    Write-Host "  [install] Instalando faster-whisper..." -ForegroundColor Yellow
    pip install faster-whisper flask 2>&1 | Out-Null
    Write-Host "  [ok] faster-whisper instalado" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Iniciando servidor... (primeira vez baixa o modelo ~150MB)" -ForegroundColor Yellow
Write-Host "  API: http://localhost:$Port/v1/audio/transcriptions" -ForegroundColor DarkGray
Write-Host "  Health: http://localhost:$Port/health" -ForegroundColor DarkGray
Write-Host "  Ctrl+C para parar" -ForegroundColor DarkGray
Write-Host ""

python "$ScriptDir\stt_server.py" --port $Port --model $Model --device cpu
