@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ================================================
    echo   [ERRORE] Node.js non trovato.
    echo.
    echo   Scarica e installa Node.js da:
    echo   https://nodejs.org/
    echo ================================================
    pause
    exit /b 1
)

echo [Nexus] Installazione dipendenze...
call npm install
if %errorlevel% neq 0 (
    echo [ERRORE] npm install fallito.
    pause
    exit /b %errorlevel%
)

echo [Nexus] Avvio server (porta 3001)...
start "Nexus Server" cmd /c npm run dev -w server

echo [Nexus] Avvio client (porta 5173)...
start "Nexus Client" cmd /c npm run dev -w client

echo [Nexus] http://localhost:5173
echo [Nexus] Chiudi le finestre del server e del client per fermare tutto.
pause
