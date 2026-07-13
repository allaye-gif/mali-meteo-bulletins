@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "PORT=1005"

echo ============================================================
echo  MALI-METEO - Mise a jour
echo ============================================================
echo.

REM ── 1. Git pull ──────────────────────────────────────────────────────────
echo [1] Telechargement des mises a jour...
cd /d "%ROOT%"
git pull
if errorlevel 1 (
    echo [ERREUR] git pull a echoue - verifiez la connexion internet.
    pause
    exit /b 1
)
echo.

REM ── 2. Arreter le serveur en cours ───────────────────────────────────────
echo [2] Arret du serveur actuel (port %PORT%)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    echo     Arret du processus %%p
    taskkill /PID %%p /F >nul 2>&1
)
echo [OK] Serveur arrete
echo.

REM ── 3. Recharger les variables .env ──────────────────────────────────────
if exist "%ROOT%.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%ROOT%.env") do (
        if not "%%a"=="" if not "%%b"=="" set "%%a=%%b"
    )
)
set "DATABASE_URL=%DATABASE_URL%?sslmode=disable"

REM ── 4. Relancer le serveur ────────────────────────────────────────────────
echo [3] Demarrage du serveur mis a jour...
echo.
echo   Frontend : http://localhost:%PORT%
echo   Reseau   : http://[votre-ip]:%PORT%
echo.
echo   (Ctrl+C pour arreter)
echo.

set "DATABASE_URL=postgresql://postgres:allaye@localhost:5432/mali_meteo_bul?sslmode=disable"
set "PORT=%PORT%"
set "NODE_ENV=production"
set "STATIC_PATH=%ROOT%artifacts\meteo-app\dist\public"

node "%ROOT%artifacts\api-server\dist\index.mjs"

echo.
echo [SERVEUR ARRETE]
pause
endlocal
