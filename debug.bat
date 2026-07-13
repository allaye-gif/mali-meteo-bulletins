@echo off
setlocal enabledelayedexpansion
title MALI-METEO DEBUG
chcp 65001 >nul 2>&1

set "ROOT=%~dp0"
set "LOG=%ROOT%debug_log.txt"
del "%LOG%" >nul 2>&1

echo ============================================================
echo  MALI-METEO DEBUG
echo ============================================================
echo.

REM === 1. Node.js ===
echo [1] Node.js :
node --version 2>&1
echo [1] Node.js : >> "%LOG%"
node --version >> "%LOG%" 2>&1
echo.

REM === 2. pnpm  (CALL obligatoire - pnpm.cmd est un batch) ===
echo [2] pnpm :
call pnpm --version 2>&1
echo [2] pnpm : >> "%LOG%"
call pnpm --version >> "%LOG%" 2>&1
echo.

REM === 3. psql ===
echo [3] Recherche psql :
set "PSQL="
where psql >nul 2>&1
if not errorlevel 1 set "PSQL=psql"
if not defined PSQL (
    for %%v in (18 17 16 15 14) do (
        if not defined PSQL (
            if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
                set "PSQL=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
            )
        )
    )
)
if defined PSQL (
    echo    Trouve : %PSQL%
    echo [3] psql : %PSQL% >> "%LOG%"
) else (
    echo    ECHEC : psql introuvable
    echo [3] psql : INTROUVABLE >> "%LOG%"
)
echo.

REM === 4. Connexion PostgreSQL ===
set "PGPASSWORD=allaye"
echo [4] Test connexion PostgreSQL :
"%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT version()" 2>&1
echo [4] code retour: %ERRORLEVEL% >> "%LOG%"
"%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT version()" >> "%LOG%" 2>&1
echo.

REM === 5. Creation base ===
echo [5] Creation base meteo_mali :
"%PSQL%" -U postgres -h localhost -p 5432 -c "CREATE DATABASE meteo_mali ENCODING 'UTF8' TEMPLATE template0" 2>&1
echo [5] code retour: %ERRORLEVEL% >> "%LOG%"
echo.

REM === 6. Frontend ===
echo [6] Frontend :
if exist "%ROOT%artifacts\meteo-app\dist\public\index.html" (
    echo    OK
    echo [6] frontend : OK >> "%LOG%"
) else (
    echo    ABSENT : %ROOT%artifacts\meteo-app\dist\public\index.html
    echo [6] frontend : ABSENT >> "%LOG%"
)
echo.

REM === 7. database_dump.sql ===
echo [7] deploy\database_dump.sql :
if exist "%ROOT%deploy\database_dump.sql" (
    echo    OK
    echo [7] dump : OK >> "%LOG%"
) else (
    echo    ABSENT
    echo [7] dump : ABSENT >> "%LOG%"
)
echo.

REM === 8. Modules Linux ===
echo [8] Modules natifs Linux :
set "LINUX_MOD=Aucun (OK)"
if exist "%ROOT%node_modules\.pnpm" (
    for /d %%D in ("%ROOT%node_modules\.pnpm\@rollup+rollup-linux*") do set "LINUX_MOD=OUI - %%D"
    for /d %%D in ("%ROOT%node_modules\.pnpm\@esbuild+linux*") do set "LINUX_MOD=OUI - %%D"
)
echo    %LINUX_MOD%
echo [8] modules linux : %LINUX_MOD% >> "%LOG%"
echo.

REM === 9. pnpm install ===
echo [9] pnpm install :
cd /d "%ROOT%"
REM Supprimer le lockfile Linux (contient @esbuild/linux-x64 pas win32-x64)
del pnpm-lock.yaml >nul 2>&1
call pnpm install --frozen-lockfile=false --ignore-scripts 2>&1
echo [9] code retour: %ERRORLEVEL% >> "%LOG%"
echo.

REM === 10. Build API ===
echo [10] Build serveur API :
cd /d "%ROOT%artifacts\api-server"
node build.mjs 2>&1
echo [10] code retour build: %ERRORLEVEL% >> "%LOG%"
cd /d "%ROOT%"
echo.

REM === 11. dist/index.mjs ===
echo [11] artifacts\api-server\dist\index.mjs :
if exist "%ROOT%artifacts\api-server\dist\index.mjs" (
    echo    OK
    echo [11] dist : OK >> "%LOG%"
) else (
    echo    ABSENT - build a echoue
    echo [11] dist : ABSENT >> "%LOG%"
)
echo.

REM === 12. Import DB ===
echo [12] Import base de donnees :
"%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -c "DROP TABLE IF EXISTS bulletins, templates CASCADE" 2>&1
"%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -f "%ROOT%deploy\database_dump.sql" 2>&1
echo [12] code retour: %ERRORLEVEL% >> "%LOG%"
echo.

REM === 13. Lancement serveur ===
echo [13] Lancement serveur (PORT=1005) :
echo      (Ctrl+C pour arreter)
echo.
set "PORT=1005"
set "NODE_ENV=production"
set "BASE_PATH=/"
set "STATIC_PATH=%ROOT%artifacts\meteo-app\dist\public"
set "DATABASE_URL=postgresql://postgres:allaye@localhost:5432/meteo_mali?sslmode=disable"
set "SESSION_SECRET=meteo-mali-anam-secret"
set "LOG_LEVEL=info"

node "%ROOT%artifacts\api-server\dist\index.mjs" 2>&1
echo.
echo [NODE ARRETE - code: %ERRORLEVEL%]
echo [NODE ARRETE] >> "%LOG%"

echo.
echo Rapport enregistre dans : %LOG%
echo.
cmd /k echo Tape EXIT pour fermer.
