@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo.
echo  ============================================================
echo   MALI-METEO Bulletins  -  ANAM
echo  ============================================================
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 1. MISE A JOUR GITHUB
:: Sauvegarde du .env AVANT git reset --hard
:: (git reset --hard ecrase les fichiers non commites)
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 2. VERIFICATIONS : Node.js, pnpm, psql
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

:: Localiser psql (PostgreSQL 14 a 18)
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
echo [OK] PostgreSQL trouve

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 3. POSTGRESQL : demarrer le service + creer la base
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set "PGPASSWORD=allaye"
"%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo [DB] Demarrage du service PostgreSQL...
    for %%v in (18 17 16 15 14) do (
        net start postgresql-x64-%%v >nul 2>&1
    )
    timeout /t 5 /nobreak >nul
    "%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT 1" >nul 2>&1
    if errorlevel 1 (
        echo [ERREUR] PostgreSQL inaccessible. Verifiez qu'il est installe et que le mot de passe est "allaye".
        goto fin
    )
)
echo [OK] PostgreSQL actif

:: Creer la base meteo_mali si elle n'existe pas
"%PSQL%" -U postgres -h localhost -p 5432 -tc "SELECT 1 FROM pg_database WHERE datname='meteo_mali'" 2>nul | find "1" >nul 2>&1
if errorlevel 1 (
    echo [DB] Creation de la base meteo_mali...
    "%PSQL%" -U postgres -h localhost -p 5432 -c "CREATE DATABASE meteo_mali ENCODING 'UTF8' LC_COLLATE='French_France.1252' LC_CTYPE='French_France.1252' TEMPLATE=template0" >nul 2>&1
    if errorlevel 1 (
        :: Fallback sans locale specifique
        "%PSQL%" -U postgres -h localhost -p 5432 -c "CREATE DATABASE meteo_mali ENCODING 'UTF8'" >nul 2>&1
    )
)
echo [OK] Base meteo_mali

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 4. FICHIER .ENV
:: Cree seulement s'il n'existe pas (ne jamais ecraser l'existant)
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

:: Charger les variables du .env
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%b"=="" (
        set "%%a=%%b"
    )
)

:: Valeurs par defaut si absentes du .env
if not defined PORT          set "PORT=3000"
if not defined NODE_ENV      set "NODE_ENV=production"
if not defined SESSION_SECRET set "SESSION_SECRET=meteo-mali-anam-secret"
if not defined LOG_LEVEL     set "LOG_LEVEL=info"

:: Variables propres a Windows (chemins absolus)
:: %~dp0 = dossier contenant le .bat (toujours avec backslash final)
set "BASE_PATH=/"
set "STATIC_PATH=%~dp0artifacts\meteo-app\dist\public"

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: CRITIQUE : forcer sslmode=disable APRES chargement du .env
:: Le driver node-postgres tente SSL par defaut.
:: PostgreSQL local n'a pas de certificat → echec SSL masque
:: par drizzle-orm ("Failed query" sans detail).
:: Cette ligne doit etre EN DERNIER pour overrider tout le reste.
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set "DATABASE_URL=postgresql://postgres:allaye@localhost:5432/meteo_mali?sslmode=disable"

echo [OK] Configuration chargee (PORT=%PORT%, NODE_ENV=%NODE_ENV%)

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 5. VERIFICATION DU FRONTEND PRE-COMPILE
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if not exist "%STATIC_PATH%\index.html" (
    echo [ERREUR] Frontend non trouve : %STATIC_PATH%\index.html
    echo          Le dist/ doit etre commite depuis Replit avant de lancer sur Windows.
    echo          Sur Replit : BASE_PATH=/ PORT=3000 pnpm --filter @workspace/meteo-app run build
    echo          Puis git add artifacts/meteo-app/dist ^&^& git commit -m "build frontend" ^&^& git push
    goto fin
)
echo [OK] Frontend present

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 6. INSTALLATION DES DEPENDANCES NODE
:: Detection des modules natifs Linux incompatibles avec Windows
:: (@rollup/rollup-linux-x64, @esbuild/linux-x64, etc.)
:: Si detectes → suppression complete + reinstallation Windows
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [INSTALL] Verification des modules Node.js...
set "NEED_CLEAN=0"
if exist "node_modules\.pnpm" (
    for /d %%D in ("node_modules\.pnpm\@rollup+rollup-linux*") do set "NEED_CLEAN=1"
    for /d %%D in ("node_modules\.pnpm\@esbuild+linux*") do set "NEED_CLEAN=1"
)
if "!NEED_CLEAN!"=="1" (
    echo [INSTALL] Modules Linux detectes - nettoyage et reinstallation Windows (5-10 min)...
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

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 7. BUILD DU SERVEUR API (esbuild uniquement, pas Vite)
:: Le frontend dist/ est deja commit depuis Replit.
:: Seul le serveur Express doit etre compile.
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 8. INITIALISATION BASE DE DONNEES
::
:: REGLES ABSOLUES (apprises lors du deploiement precedent) :
:: - NE PAS utiliser drizzle-kit push sur Windows (bugs ESM/crypto)
:: - NE PAS utiliser schema.sql + dump ensemble (conflit CREATE TABLE)
:: - deploy\database_dump.sql contient CREATE TABLE + donnees
::   en une seule passe : c'est la seule source de verite
:: - Detection via fichier temp car for/f + psql inline est fragile
::
:: Strategie :
::   1. Verifier si la table 'bulletins' existe et contient des donnees
::   2. Si vide ou absente → DROP + reimporter le dump complet
::   3. Si donnees presentes → ne rien faire
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [DB] Verification des donnees...

set "TEMP_COUNT=%TEMP%\meteo_mali_count.txt"
"%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -t -c "SELECT COUNT(*) FROM bulletins" > "!TEMP_COUNT!" 2>nul
set "BULLETIN_COUNT=0"
if exist "!TEMP_COUNT!" (
    set /p BULLETIN_COUNT= < "!TEMP_COUNT!"
    del "!TEMP_COUNT!" >nul 2>&1
)
:: Supprimer les espaces autour du nombre (psql -t retourne "       0")
for /f "tokens=* delims= " %%x in ("!BULLETIN_COUNT!") do set "BULLETIN_COUNT=%%x"

if "!BULLETIN_COUNT!"=="0" (
    if exist "deploy\database_dump.sql" (
        echo [DB] Base vide ou nouvelle - initialisation...
        :: DROP d'abord pour que CREATE TABLE du dump ne plante pas sur "already exists"
        "%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -c "DROP TABLE IF EXISTS bulletins, templates CASCADE" >nul 2>&1
        :: Le dump cree les tables ET insere toutes les donnees
        "%PSQL%" -U postgres -h localhost -p 5432 -d meteo_mali -f "deploy\database_dump.sql" >nul 2>&1
        if not errorlevel 1 (
            echo [OK] Base initialisee depuis deploy\database_dump.sql
        ) else (
            echo [WARN] Import termine avec des avertissements (verifiez deploy\database_dump.sql)
        )
    ) else (
        echo [WARN] deploy\database_dump.sql introuvable - base vide
        echo        Lancez pg_dump sur Replit et committez le fichier.
    )
) else (
    echo [OK] Donnees presentes (!BULLETIN_COUNT! bulletins)
)

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 9. DEMARRAGE AUTOMATIQUE AU BOOT
:: Sans /rl HIGHEST (necessite admin et echoue silencieusement)
:: /sc onlogon = lance quand l'utilisateur se connecte
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
schtasks /query /tn "MALI-METEO" >nul 2>&1
if errorlevel 1 (
    echo [STARTUP] Installation du demarrage automatique...
    schtasks /create /tn "MALI-METEO" /tr "cmd /k \"%~f0\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Demarre automatiquement a chaque connexion Windows
    ) else (
        echo [WARN] Demarrage automatique non installe (lancez ce .bat en Administrateur)
    )
)

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 10. PARE-FEU WINDOWS
:: Ouvre le port une seule fois (idempotent)
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 11. ADRESSE IP DU RESEAU LOCAL
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    if not defined LOCAL_IP set "LOCAL_IP=%%a"
)
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:: 12. LANCEMENT DU SERVEUR AVEC AUTO-RESTART
:: Si node crashe → redemarrage automatique apres 5 secondes
:: Pour arreter definitvement → fermer la fenetre CMD
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
