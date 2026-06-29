@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

:: === Verifica Node.js ===
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

:: === Verifica pdftoppm (poppler) ===
where pdftoppm >nul 2>nul
if %errorlevel% neq 0 (
    echo ================================================
    echo   [AVVISO] pdftoppm non trovato.
    echo   I PDF scansionati non funzioneranno.
    echo.
    echo   Per installare:
    echo   choco install poppler
    echo.
    echo   Oppure scarica da:
    echo   https://github.com/oschwartz10612/poppler-windows/releases
    echo ================================================
)

:: === Verifica .env ===
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ================================================
        echo   [OK] .env creato da .env.example
        echo   MODIFICA .env con la tua chiave Cerebras!
        echo ================================================
    ) else (
        echo ================================================
        echo   [ERRORE] .env e .env.example mancanti.
        echo   Crea un file .env con:
        echo   CEREBRAS_API_KEY=la_tua_chiave
        echo   CEREBRAS_API_URL=https://api.cerebras.ai/v1/chat/completions
        echo   CEREBRAS_MODEL=gemma-4-31b
        echo ================================================
        pause
        exit /b 1
    )
)

:: === Installazione dipendenze ===
echo [Nexus] Installazione dipendenze...
call npm install
if %errorlevel% neq 0 (
    echo [Nexus] npm install fallito. Tento rebuild moduli nativi...
    call npm rebuild
    if %errorlevel% neq 0 (
        echo [ERRORE] Installazione dipendenze fallita.
        pause
        exit /b %errorlevel%
    )
)

:: === Avvio server e client ===
echo [Nexus] Avvio server (porta 3001)...
start "Nexus Server" cmd /c npm run dev -w server

echo [Nexus] Avvio client (porta 5173)...
start "Nexus Client" cmd /c npm run dev -w client

echo [Nexus] http://localhost:5173
echo [Nexus] Chiudi le finestre del server e del client per fermare tutto.
pause
