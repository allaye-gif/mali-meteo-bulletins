@echo off
title MALI-METEO DEBUG
chcp 65001 >nul 2>&1

echo ============================================
echo  MALI-METEO - MODE DEBUG
echo  Cette fenetre NE SE FERMERA PAS
echo ============================================
echo.

echo [ETAPE 1] Verification Node.js...
node --version
if errorlevel 1 (
    echo ECHEC : Node.js introuvable
    pause
    exit /b 1
)
echo OK
echo.
pause

echo [ETAPE 2] Verification pnpm...
pnpm --version
if errorlevel 1 (
    echo ECHEC : pnpm introuvable, installation...
    npm install -g pnpm
)
echo.
pause

echo [ETAPE 3] Recherche de psql...
set "PSQL="
where psql 2>nul && set "PSQL=psql"
if not defined PSQL (
    for %%v in (18 17 16 15 14) do (
        if not defined PSQL (
            if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
                set "PSQL=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
                echo Trouve : C:\Program Files\PostgreSQL\%%v\bin\psql.exe
            )
        )
    )
)
if not defined PSQL (
    echo ECHEC : psql introuvable
    pause
    exit /b 1
)
echo PSQL=%PSQL%
echo.
pause

echo [ETAPE 4] Test connexion PostgreSQL (mdp: allaye)...
set "PGPASSWORD=allaye"
"%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT version()"
if errorlevel 1 (
    echo ECHEC : connexion PostgreSQL impossible
    echo Tentative demarrage service...
    net start postgresql-x64-18
    net start postgresql-x64-17
    net start postgresql-x64-16
    net start postgresql-x64-15
    net start postgresql-x64-14
    timeout /t 5 /nobreak
    "%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT version()"
    if errorlevel 1 (
        echo ECHEC definitif : PostgreSQL inaccessible
        pause
        exit /b 1
    )
)
echo.
pause

echo [ETAPE 5] Creation base meteo_mali (si absente)...
"%PSQL%" -U postgres -h localhost -p 5432 -c "CREATE DATABASE meteo_mali ENCODING 'UTF8' TEMPLATE=template0"
echo Code retour: %ERRORLEVEL% (1=deja existante, c'est OK)
echo.
pause

echo [ETAPE 6] Verification frontend...
set "STATIC_PATH=%~dp0artifacts\meteo-app\dist\public"
if exist "%STATIC_PATH%\index.html" (
    echo OK : %STATIC_PATH%\index.html present
) else (
    echo ECHEC : %STATIC_PATH%\index.html absent
)
echo.
pause

echo [ETAPE 7] Verification deploy\database_dump.sql...
if exist "%~dp0deploy\database_dump.sql" (
    echo OK : deploy\database_dump.sql present
) else (
    echo ABSENT : deploy\database_dump.sql introuvable
)
echo.
pause

echo [ETAPE 8] Installation dependances pnpm...
cd /d "%~dp0"
if exist "node_modules\.pnpm\@rollup+rollup-linux*" (
    echo Modules Linux detectes, suppression...
    rmdir /s /q node_modules
)
pnpm install --frozen-lockfile=false
echo Code retour pnpm install: %ERRORLEVEL%
echo.
pause

echo [ETAPE 9] Build serveur API...
cd /d "%~dp0artifacts\api-server"
node build.mjs
echo Code retour build: %ERRORLEVEL%
cd /d "%~dp0"
echo.
pause

echo [ETAPE 10] Import base de donnees...
"%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -c "DROP TABLE IF EXISTS bulletins, templates CASCADE"
"%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -f "%~dp0deploy\database_dump.sql"
echo Code retour import: %ERRORLEVEL%
echo.
pause

echo [ETAPE 11] Lancement serveur (PORT=1005)...
set "PORT=1005"
set "NODE_ENV=production"
set "BASE_PATH=/"
set "STATIC_PATH=%~dp0artifacts\meteo-app\dist\public"
set "DATABASE_URL=postgresql://postgres:allaye@localhost:5432/meteo_mali?sslmode=disable"
set "SESSION_SECRET=meteo-mali-anam-secret"
set "LOG_LEVEL=info"
node "%~dp0artifacts\api-server\dist\index.mjs"

echo.
echo Serveur arrete (code: %ERRORLEVEL%)
pause
