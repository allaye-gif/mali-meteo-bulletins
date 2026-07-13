@echo off
chcp 65001 >nul

REM ── Elevation automatique UAC ─────────────────────────────────────────────
net session >nul 2>&1
if errorlevel 1 (
    echo Elevation administrateur requise - cliquez Oui dans la fenetre UAC...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

setlocal
set "PORT=1005"
set "ROOT=%~dp0"

echo ============================================================
echo  MALI-METEO - Configuration reseau (Admin)
echo ============================================================
echo.

REM ── 1. Pare-feu : port entrant ───────────────────────────────────────────
echo [1] Ouverture du port %PORT% dans le pare-feu Windows...
netsh advfirewall firewall delete rule name="MALI-METEO %PORT%" >nul 2>&1
netsh advfirewall firewall add rule name="MALI-METEO %PORT%" dir=in action=allow protocol=TCP localport=%PORT%
if errorlevel 1 (
    echo [ERREUR] Impossible d'ouvrir le port - verifiez les droits.
) else (
    echo [OK] Port %PORT% ouvert - accessible depuis tout le reseau local
)
echo.

REM ── 2. Tache planifiee : demarrage automatique au boot ───────────────────
echo [2] Installation du demarrage automatique (au demarrage Windows)...
schtasks /delete /tn "MALI-METEO" /f >nul 2>&1
schtasks /create /tn "MALI-METEO" /tr "cmd /c \"%ROOT%start.bat\"" /sc onstart /ru "SYSTEM" /rl HIGHEST /f
if errorlevel 1 (
    echo [ERREUR] Tache planifiee non creee.
) else (
    echo [OK] L'application demarrera automatiquement a chaque demarrage Windows
)
echo.

REM ── 3. Adresse IP locale ─────────────────────────────────────────────────
echo [3] Adresse IP du serveur sur le reseau :
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "IP=%%a"
    setlocal enabledelayedexpansion
    set "IP=!IP: =!"
    echo     http://!IP!:%PORT%
    endlocal
)
echo.
echo Les autres PC du reseau peuvent acceder a l'application via l'adresse ci-dessus.
echo.
pause
endlocal
