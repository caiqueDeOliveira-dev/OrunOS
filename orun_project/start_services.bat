@echo off
title Orun OS — Local Services
echo ========================================
echo   Orun OS — Starting Local Services
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Install Python 3.10+ and try again.
    pause
    exit /b 1
)

echo [1/2] Starting Piper TTS server (port 5002)...
start "Piper TTS" python piper_server.py --port 5002

echo [2/2] Starting Whisper STT server (port 8080)...
start "Whisper STT" python stt_server.py --port 8080 --model base

echo.
echo ========================================
echo   All services started!
echo   Piper TTS:  http://localhost:5002
echo   Whisper STT: http://localhost:8080
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

REM Kill all service processes
taskkill /FI "WINDOWTITLE eq Piper TTS*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Whisper STT*" /F >nul 2>&1
echo Services stopped.
