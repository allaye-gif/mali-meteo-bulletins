@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo.
echo  ============================================================
echo   MALI-METEO Bulletins  -  ANAM
echo  ============================================================
echo.

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 1. MISE A JOUR GITHUB
REM Sauvegarde du .env AVANT git reset --hard
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
where git >nul 2>&1
if not errorlevel 1 (
    echo [GIT] Mise a jour depuis GitHub...
    if exist ".env" copy ".env" ".env.bak" >nul 2>&1
    git fetch origin main >nul 2>&1
    git reset --hard origin/main >nul 2>&1
    if exist ".env.bak" (
        copy ".env.bak" ".env" >nul 2>&1
        del ".env.bak" >nul 2>&1
    )
    echo [OK] Code a jour
) else (
    echo [WARN] Git non installe - pas de mise a jour automatique
)

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 2. VERIFICATIONS : Node.js, pnpm, psql
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js introuvable. Installez-le depuis https://nodejs.org
    goto fin
)
for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INSTALL] Installation de pnpm...
    call npm install -g pnpm >nul 2>&1
)
for /f "tokens=*" %%v in ('pnpm --version 2^>nul') do echo [OK] pnpm %%v

REM Localiser psql (PostgreSQL 14 a 18)
set "PSQL="
where psql >nul 2>&1 && set "PSQL=psql"
if not defined PSQL (
    for %%v in (18 17 16 15 14) do (
        if not defined PSQL (
            if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
                set "PSQL=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
            )
        )
    )
)
if not defined PSQL (
    echo [ERREUR] PostgreSQL introuvable.
    echo          Installez-le depuis https://www.postgresql.org/download/windows/
    goto fin
)
echo [OK] PostgreSQL : %PSQL%

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 3. POSTGRESQL : demarrer le service + creer la base
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set "PGPASSWORD=allaye"

"%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo [DB] Demarrage du service PostgreSQL...
    net start postgresql-x64-18 >nul 2>&1
    net start postgresql-x64-17 >nul 2>&1
    net start postgresql-x64-16 >nul 2>&1
    net start postgresql-x64-15 >nul 2>&1
    net start postgresql-x64-14 >nul 2>&1
    timeout /t 5 /nobreak >nul
    "%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT 1" >nul 2>&1
    if errorlevel 1 (
        echo [ERREUR] PostgreSQL inaccessible. Verifiez l'installation et le mot de passe "allaye".
        goto fin
    )
)
echo [OK] PostgreSQL actif

REM Verifier si la base meteo_mali existe
set "TEMP_DBCHECK=%TEMP%\meteo_dbcheck.txt"
"%PSQL%" -U postgres -h localhost -p 5432 -t -c "SELECT COUNT(*) FROM pg_database WHERE datname='meteo_mali'" > "%TEMP_DBCHECK%" 2>nul
set "DB_EXISTS=0"
if exist "%TEMP_DBCHECK%" (
    set /p DB_EXISTS= < "%TEMP_DBCHECK%"
    del "%TEMP_DBCHECK%" >nul 2>&1
)
for /f "tokens=* delims= " %%x in ("!DB_EXISTS!") do set "DB_EXISTS=%%x"

if "!DB_EXISTS!"=="0" (
    echo [DB] Creation de la base meteo_mali...
    "%PSQL%" -U postgres -h localhost -p 5432 -c "CREATE DATABASE meteo_mali ENCODING 'UTF8' TEMPLATE=template0"
    if errorlevel 1 (
        echo [ERREUR] Impossible de creer la base meteo_mali.
        goto fin
    )
    echo [OK] Base meteo_mali creee
) else (
    echo [OK] Base meteo_mali existante
)

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 4. FICHIER .ENV
REM Cree seulement s'il n'existe pas
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if not exist ".env" (
    (
        echo DATABASE_URL=postgresql://postgres:allaye@localhost:5432/meteo_mali
        echo PORT=1005
        echo NODE_ENV=production
        echo SESSION_SECRET=meteo-mali-anam-secret
        echo LOG_LEVEL=info
    ) > .env
    echo [OK] .env cree
)

REM Charger les variables du .env
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%b"=="" (
        set "%%a=%%b"
    )
)

REM Valeurs par defaut si absentes du .env
if not defined PORT           set "PORT=1005"
if not defined NODE_ENV       set "NODE_ENV=production"
if not defined SESSION_SECRET set "SESSION_SECRET=meteo-mali-anam-secret"
if not defined LOG_LEVEL      set "LOG_LEVEL=info"

REM Variables propres a Windows (chemins absolus)
REM %~dp0 = dossier contenant le .bat (avec backslash final)
set "BASE_PATH=/"
set "STATIC_PATH=%~dp0artifacts\meteo-app\dist\public"

REM CRITIQUE : forcer sslmode=disable APRES chargement du .env
REM Le driver node-postgres tente SSL par defaut.
REM PostgreSQL local n'a pas de certificat → echec SSL masque
REM par drizzle-orm en "Failed query" sans aucun detail.
set "DATABASE_URL=postgresql://postgres:allaye@localhost:5432/meteo_mali?sslmode=disable"

echo [OK] Configuration chargee (PORT=%PORT%, NODE_ENV=%NODE_ENV%)

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 5. VERIFICATION DU FRONTEND PRE-COMPILE
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if not exist "%STATIC_PATH%\index.html" (
    echo [ERREUR] Frontend non trouve : %STATIC_PATH%\index.html
    echo          Le dist/ doit etre commite depuis Replit avant de lancer sur Windows.
    echo          Sur Replit : BASE_PATH=/ PORT=1005 pnpm --filter @workspace/meteo-app run build
    echo          Puis git add artifacts/meteo-app/dist ^&^& git commit -m "build" ^&^& git push
    goto fin
)
echo [OK] Frontend present

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 6. INSTALLATION DES DEPENDANCES NODE
REM Detection des modules natifs Linux incompatibles avec Windows
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [INSTALL] Verification des modules Node.js...
set "NEED_CLEAN=0"
if exist "node_modules\.pnpm" (
    for /d %%D in ("node_modules\.pnpm\@rollup+rollup-linux*") do set "NEED_CLEAN=1"
    for /d %%D in ("node_modules\.pnpm\@esbuild+linux*") do set "NEED_CLEAN=1"
)
if "!NEED_CLEAN!"=="1" (
    echo [INSTALL] Modules Linux detectes - nettoyage pour Windows (5-10 min)...
    rmdir /s /q node_modules >nul 2>&1
    if exist pnpm-lock.yaml del pnpm-lock.yaml >nul 2>&1
)

if not exist "node_modules" (
    echo [INSTALL] Installation des dependances (premiere fois, patientez)...
    call pnpm install --frozen-lockfile=false
    if errorlevel 1 (
        echo [ERREUR] pnpm install a echoue.
        goto fin
    )
)
echo [OK] Dependances installees

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 7. BUILD DU SERVEUR API (esbuild uniquement, pas Vite)
REM Le frontend dist/ est deja commite depuis Replit.
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [BUILD] Compilation du serveur API...
pushd artifacts\api-server
node build.mjs
if errorlevel 1 (
    echo [ERREUR] Build du serveur echoue.
    popd
    goto fin
)
popd
echo [OK] Serveur API compile

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 8. INITIALISATION BASE DE DONNEES
REM
REM REGLES ABSOLUES :
REM - NE PAS utiliser drizzle-kit push sur Windows (bugs ESM/crypto)
REM - NE PAS utiliser schema.sql + dump ensemble (conflit CREATE TABLE)
REM - deploy\database_dump.sql = CREATE TABLE + donnees en une passe
REM - Detection via fichier temp (for/f + psql inline est fragile)
REM
REM Si table bulletins absente ou vide → DROP + reimporter le dump
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [DB] Verification des donnees...

set "TEMP_COUNT=%TEMP%\meteo_count.txt"
"%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -t -c "SELECT COUNT(*) FROM bulletins" > "%TEMP_COUNT%" 2>nul
set "BULLETIN_COUNT=0"
if exist "%TEMP_COUNT%" (
    set /p BULLETIN_COUNT= < "%TEMP_COUNT%"
    del "%TEMP_COUNT%" >nul 2>&1
)
for /f "tokens=* delims= " %%x in ("!BULLETIN_COUNT!") do set "BULLETIN_COUNT=%%x"

if "!BULLETIN_COUNT!"=="0" (
    if exist "deploy\database_dump.sql" (
        echo [DB] Base vide ou nouvelle - initialisation en cours...
        "%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -c "DROP TABLE IF EXISTS bulletins, templates CASCADE" >nul 2>&1
        "%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -f "deploy\database_dump.sql" >nul 2>&1
        if not errorlevel 1 (
            echo [OK] Base initialisee depuis deploy\database_dump.sql
        ) else (
            echo [WARN] Import termine avec des avertissements
        )
    ) else (
        echo [WARN] deploy\database_dump.sql introuvable - base vide
    )
) else (
    echo [OK] Donnees presentes ^(!BULLETIN_COUNT! bulletins^)
)

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 9. DEMARRAGE AUTOMATIQUE AU BOOT
REM Sans /rl HIGHEST (necessite admin, echoue silencieusement)
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
schtasks /query /tn "MALI-METEO" >nul 2>&1
if errorlevel 1 (
    echo [STARTUP] Installation du demarrage automatique...
    schtasks /create /tn "MALI-METEO" /tr "cmd /k \"%~f0\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Demarre automatiquement a chaque connexion Windows
    ) else (
        echo [WARN] Demarrage automatique non installe (lancez en Administrateur)
    )
)

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 10. PARE-FEU WINDOWS
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
netsh advfirewall firewall show rule name="MALI-METEO %PORT%" >nul 2>&1
if errorlevel 1 (
    echo [RESEAU] Ouverture du port %PORT% dans le pare-feu...
    netsh advfirewall firewall add rule name="MALI-METEO %PORT%" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Port %PORT% ouvert
    ) else (
        echo [WARN] Pare-feu non modifie (lancez en Administrateur pour ouvrir le port)
    )
)

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 11. ADRESSE IP DU RESEAU LOCAL
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    if not defined LOCAL_IP set "LOCAL_IP=%%a"
)
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 12. LANCEMENT DU SERVEUR AVEC AUTO-RESTART
REM Si node crashe → redemarrage automatique apres 5 secondes
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo  ============================================================
echo   MALI-METEO Bulletins - Serveur demarre !
echo.
echo   Sur ce PC     : http://localhost:%PORT%
if defined LOCAL_IP echo   Reseau local  : http://%LOCAL_IP%:%PORT%
echo.
echo   Base de donnees : meteo_mali @ localhost:5432
echo   Frontend        : %STATIC_PATH%
echo.
echo   Fermez cette fenetre pour arreter l'application.
echo  ============================================================
echo.

start "" "http://localhost:%PORT%"

:restart
node artifacts\api-server\dist\index.mjs
echo.
echo [RESTART] Serveur arrete - redemarrage dans 5 secondes...
echo           (Fermez la fenetre pour quitter definitivement)
timeout /t 5 /nobreak >nul
goto restart

:fin
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
endlocal
