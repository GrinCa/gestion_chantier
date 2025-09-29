@echo off
rem ==========================================
rem  GESTION CHANTIER - Script Principal
rem ==========================================
rem Version unifiee - Remplace tous les autres scripts

:MAIN_MENU
cls
echo ==========================================
echo   GESTION CHANTIER - Architecture Universelle
echo ==========================================
echo.
echo  DEMARRAGE RAPIDE:
echo [1] Start Full Stack (API + Web)
echo [2] Start Dev Mode (API + Web --host pour mobile)
echo [3] Start Mobile (Expo + React Native)
echo [4] Start All (Full Stack + Mobile)
echo.
echo  MOBILE EXPO:
echo [M1] Mobile Dev Server (Expo start)
echo [M2] Mobile Android (emulator)
echo [M3] Mobile iOS (simulator)
echo [M4] Mobile Web (Expo web)
echo.
echo  BUILD:
echo [5] Build All (Core + Web + Mobile)
echo [6] Build Core seulement  
echo [7] Build Web seulement
echo [8] Build Mobile (Android APK)
echo [9] Preview Web (dist)
echo.
echo  CONFIGURATION:
echo [C1] Fix .env (corriger ports/config)
echo [C2] Changer port API
echo [C3] Voir configuration actuelle
echo [C4] Setup Mobile (install Expo CLI)
echo.
echo  MAINTENANCE:
echo [I] Install All Dependencies
echo [S] Stop All Servers
echo [M] Maintenance Avancee (script separe)
echo.
echo [Q] Quitter
echo ==========================================
set /p choice=Choix : 

if /I "%choice%"=="1" goto START_FULL
if /I "%choice%"=="2" goto START_DEV
if /I "%choice%"=="3" goto START_MOBILE
if /I "%choice%"=="4" goto START_ALL
if /I "%choice%"=="M1" goto MOBILE_DEV
if /I "%choice%"=="M2" goto MOBILE_ANDROID
if /I "%choice%"=="M3" goto MOBILE_IOS
if /I "%choice%"=="M4" goto MOBILE_WEB
if /I "%choice%"=="5" goto BUILD_ALL
if /I "%choice%"=="6" goto BUILD_CORE
if /I "%choice%"=="7" goto BUILD_WEB
if /I "%choice%"=="8" goto BUILD_MOBILE
if /I "%choice%"=="9" goto PREVIEW_WEB
if /I "%choice%"=="C1" goto FIX_ENV
if /I "%choice%"=="C2" goto CHANGE_API_PORT
if /I "%choice%"=="C3" goto SHOW_CONFIG
if /I "%choice%"=="C4" goto SETUP_MOBILE
if /I "%choice%"=="I" goto INSTALL_ALL
if /I "%choice%"=="S" goto STOP_ALL
if /I "%choice%"=="M" goto MAINTENANCE
if /I "%choice%"=="Q" goto QUIT

goto MAIN_MENU

rem ==========================================
rem  DEMARRAGE RAPIDE
rem ==========================================

:START_FULL
echo.
echo Demarrage Full Stack (API + Web)
echo ==========================================
echo.
echo [1/3] Demarrage API Server (hot reload si nodemon present)...
cd /d "%~dp0\packages\server"
where nodemon >nul 2>&1
if %errorlevel%==0 (
    echo ▶ Utilisation de nodemon pour rechargement a chaud du serveur
    start "API Server" cmd /k "echo API Server (nodemon) - Gestion Chantier && npx nodemon --watch . --ext js,mjs,cjs,json --signal SIGTERM index.js"
) else (
    echo ⚠ nodemon non trouve (npm i -g nodemon ou npm i --save-dev nodemon dans packages/server)
    echo ▶ Demarrage sans hot reload
    start "API Server" cmd /k "echo API Server - Gestion Chantier && node index.js"
)

echo [2/3] Demarrage Core Watch (tsc --watch pour packages/core)...
cd /d "%~dp0\packages\core"
start "Core Watch" cmd /k "echo Core Watch - tsc --watch && npm run dev && pause"

echo [3/3] Demarrage Web Dev Server (port 5173, HMR actif)...
cd /d "%~dp0\packages\web"
where nodemon >nul 2>&1
if %errorlevel%==0 (
    echo ▶ Utilisation de nodemon pour relancer le dev server quand packages/core/dist change
    rem nodemon va relancer "npm run dev" quand les fichiers JS de core/dist changent
    start "Web Dev Server" cmd /k "echo Web Dev Server (watch core) - Gestion Chantier && npx nodemon --watch ..\core\dist --ext js,json --signal SIGTERM --exec \"npm run dev\""
) else (
    echo ⚠ nodemon non trouve — demarrage sans watcher (Vite HMR reste actif pour changements front)
    start "Web Dev Server" cmd /k "echo Web Dev Server - Gestion Chantier && npm run dev"
)

echo.
echo 🔁 HOT RELOAD SUGGERE:
echo    - Front: Vite (packages/web) HMR actif
echo    - Core: tentative d'un "build --watch" pour packages/core (reconstruit dist/ si supporte)
echo    - API: nodemon (si installe)
echo.
echo.
echo ARCHITECTURE CORE DeMARReE !
echo.
echo  Web App: http://localhost:5173
echo  API Server: http://localhost:3001
pause
goto MAIN_MENU

:START_DEV
echo.
echo  Demarrage Dev Mode (accessible mobile)
echo ==========================================
echo.

echo [1/3] Demarrage API Server...
cd /d "%~dp0\packages\server"
start "API Server" cmd /k "echo API Server && node index.js"

echo [2/3] Attente API...
timeout /t 3 /nobreak >nul

echo [3/3] Demarrage Web Dev (--host pour accès mobile)...
cd /d "%~dp0\packages\web"
start "Web Dev --host" cmd /k "echo Web Dev --host && npm run dev -- --host"

echo.
echo  DEV MODE DeMARRe !
echo.
echo  Web (local): http://localhost:5173
echo  Web (mobile): http://[IP_LOCAL]:5173
echo  API: http://localhost:3001
echo.
pause
goto MAIN_MENU

:START_MOBILE
echo.
echo Demarrage Mobile (Expo React Native)
echo ==========================================
echo.

echo [1/2] Verification Expo CLI...
where expo >nul 2>&1
if %errorlevel% neq 0 (
    echo Expo CLI non installe
    echo Installation en cours...
    call npm install -g @expo/cli
)

echo [2/2] Demarrage serveur Expo...
cd /d "%~dp0\packages\mobile"
echo.
echo  Lancement de l'app mobile Expo...
echo.
echo  UTILISATION:
echo   → Scanner QR code avec Expo Go (mobile)
echo   → Presser 'w' pour ouvrir dans navigateur
echo   → Presser 'a' pour Android emulator
echo   → Presser 'i' pour iOS simulator
echo.
start " Expo Mobile Server" cmd /k "echo  Expo Mobile - Gestion Chantier && npx expo start"

echo.
echo  MOBILE EXPO DeMARRe !
pause
goto MAIN_MENU

:START_ALL
echo.
echo  Demarrage COMPLET (Full Stack + Mobile)
echo ==========================================
echo.

echo [1/4] Demarrage API Server...
cd /d "%~dp0\packages\server"
start " API Server" cmd /k "echo  API Server && node index.js"

echo [2/4] Attente API...
timeout /t 3 /nobreak >nul

echo [3/4] Demarrage Web Dev...
cd /d "%~dp0\packages\web"
start " Web Dev" cmd /k "echo  Web Dev && npm run dev"

echo [4/4] Demarrage Mobile Expo...
cd /d "%~dp0\packages\mobile"
start " Expo Mobile" cmd /k "echo  Expo Mobile && npx expo start"

echo.
echo  ARCHITECTURE UNIVERSELLE COMPLÈTE !
echo.
echo  Web: http://localhost:5173
echo  API: http://localhost:3001
echo  Mobile: Scanner QR Expo ou http://localhost:8081
echo.
echo  LOGIQUE MeTIER PARTAGeE:
echo   → Calculatrice identique Web + Mobile
echo   → DataEngine universel
echo   → Configuration centralisee
echo.
pause
goto MAIN_MENU

rem ==========================================
rem  MOBILE EXPO - Actions specifiques
rem ==========================================

:MOBILE_DEV
echo.
echo  Mobile Dev Server (Expo)
echo ==========================================
cd /d "%~dp0\packages\mobile"
echo Demarrage serveur de developpement mobile...
call npx expo start
pause
goto MAIN_MENU

:MOBILE_ANDROID
echo.
echo  Mobile Android (emulateur)
echo ==========================================
cd /d "%~dp0\packages\mobile"
echo Ouverture sur emulateur Android...
call npx expo start --android
pause
goto MAIN_MENU

:MOBILE_IOS
echo.
echo  Mobile iOS (simulateur)
echo ==========================================
cd /d "%~dp0\packages\mobile"
echo Ouverture sur simulateur iOS...
call npx expo start --ios
pause
goto MAIN_MENU

:MOBILE_WEB
echo.
echo  Mobile Web (Expo Web)
echo ==========================================
cd /d "%~dp0\packages\mobile"
echo Ouverture version web de l'app mobile...
call npx expo start --web
pause
goto MAIN_MENU

rem ==========================================
rem  BUILD
rem ==========================================

:BUILD_ALL
echo.
echo  Build All (Core + Web + Mobile)
echo ==========================================
echo.

echo [1/3] Build Core package...
cd /d "%~dp0\packages\core"
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR: Build core echoue
    pause
    goto MAIN_MENU
)
echo Core build OK

echo [2/3] Build Web package...
cd /d "%~dp0\packages\web"
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR: Build web echoue
    pause
    goto MAIN_MENU
)
echo Web build OK

echo [3/3] Build Mobile package...
cd /d "%~dp0\packages\mobile"
call npx expo export --platform web --output-dir web-build
if %errorlevel% neq 0 (
    echo Warning: Mobile web build echoue (optionnel)
) else (
    echo Mobile web build OK
)

echo.
echo BUILD ALL TERMINe !
echo.
echo Core: packages/core/dist/
echo Web: packages/web/dist/
echo Mobile: packages/mobile/web-build/
echo.
pause
goto MAIN_MENU

:BUILD_CORE
echo.
echo Build Core seulement...
cd /d "%~dp0\packages\core"
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR: Build core echoue
    pause
) else (
    echo Core build OK
    pause
)
goto MAIN_MENU

:BUILD_WEB
echo.
echo Build Web seulement...
cd /d "%~dp0\packages\web"
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR: Build web echoue
    pause
) else (
    echo Web build OK
    pause
)
goto MAIN_MENU

:BUILD_MOBILE
echo.
echo Build Mobile (Android APK)
echo ==========================================
echo.

cd /d "%~dp0\packages\mobile"

echo Choix du build mobile:
echo [1] APK Android (local)
echo [2] Web build (PWA)
echo [3] EAS build (cloud - production)
echo.
set /p buildchoice=Choix : 

if "%buildchoice%"=="1" (
    echo.
    echo Build APK Android...
    echo Necessite Android Studio et SDK configure
    call npx expo build:android
) else if "%buildchoice%"=="2" (
    echo.
    echo 🌐 Build Web (PWA)...
    call npx expo export --platform web --output-dir web-build
    echo ✅ Export PWA termine: packages/mobile/web-build/
) else if "%buildchoice%"=="3" (
    echo.
    echo ☁️  EAS Build (cloud)...
    echo ⚠️  Necessite compte Expo et EAS CLI
    call npx eas build --platform android
) else (
    echo Choix invalide
)

pause
goto MAIN_MENU

:PREVIEW_WEB
echo.
echo 👀 Preview Web (serveur dist)...
cd /d "%~dp0\packages\web"
echo Demarrage serveur preview...
call npm run preview
pause
goto MAIN_MENU

rem ==========================================
rem  CONFIGURATION
rem ==========================================

:FIX_ENV
echo.
echo 🔧 Correction fichier .env
echo ==========================================
echo.

cd /d "%~dp0"
echo Generation .env unifie...

(
echo # Configuration Gestion Chantier - Development
echo # ============================================
echo # ⚠️  Fichier genere automatiquement - Ports unifies
echo.
echo # API Server - Port unifie
echo PORT=3001
echo API_PORT=3001
echo.
echo # Authentification
echo AUTH_MODE=dev
echo # AUTH_MODE=strict  # Pour mode production avec mot de passe
echo.
echo # Base de donnees
echo DB_NAME=users.db
echo.
echo # Web Development - URL coherente avec API_PORT
echo VITE_API_URL=http://localhost:3001
echo VITE_PORT=5173
echo.
echo # Mode developpement
echo NODE_ENV=development
echo.
echo # ===== NOTES =====
echo # - PORT et API_PORT doivent etre identiques
echo # - VITE_API_URL doit correspondre a http://localhost:[API_PORT]
echo # - Ces valeurs sont lues par packages/core/config/index.ts
) > .env

echo ✅ Fichier .env corrige !
echo.
echo 📊 Configuration standard:
echo   - API Server: http://localhost:3001
echo   - Web Dev: http://localhost:5173
echo   - Config centralisee: packages/core/config/
echo.
pause
goto MAIN_MENU

:CHANGE_API_PORT
echo.
echo 🔧 Changer port API
echo ==========================================
echo.
echo Port actuel: 3001
echo.
set /p newport=Nouveau port API : 
if "%newport%"=="" goto MAIN_MENU

echo.
echo Mise a jour configuration...
cd /d "%~dp0"

(
echo # Configuration Gestion Chantier - Development
echo # ============================================
echo # ⚠️  Port API modifie
echo.
echo PORT=%newport%
echo API_PORT=%newport%
echo AUTH_MODE=dev
echo DB_NAME=users.db
echo VITE_API_URL=http://localhost:%newport%
echo VITE_PORT=5173
echo NODE_ENV=development
) > .env

echo.
echo ✅ Configuration mise a jour !
echo   - API Port: %newport%
echo   - API URL: http://localhost:%newport%
echo.
echo ⚠️  Relancez les serveurs pour appliquer les changements
pause
goto MAIN_MENU

:SHOW_CONFIG
echo.
echo 📊 Configuration actuelle
echo ==========================================
echo.
cd /d "%~dp0"
if exist .env (
    type .env
) else (
    echo ❌ Fichier .env manquant
    echo Utilisez l'option [7] pour le creer
)
echo.
pause
goto MAIN_MENU

:SETUP_MOBILE
echo.
echo 🔧 Setup Mobile (Expo + Dependencies)
echo ==========================================
echo.

echo [1/4] Verification Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js requis - Installez depuis nodejs.org
    pause
    goto MAIN_MENU
)

echo [2/4] Installation Expo CLI globalement...
call npm install -g @expo/cli

echo [3/4] Installation dependances mobile...
cd /d "%~dp0\packages\mobile"
call npm install

echo [4/4] Build du package Core (requis)...
cd /d "%~dp0\packages\core"
call npm run build

echo.
echo ✅ SETUP MOBILE TERMINe !
echo.
echo 💡 PReT POUR:
echo   → Developpement mobile avec Expo
echo   → Test sur emulateur/simulateur
echo   → Build APK/IPA
echo   → Logique metier partagee Web+Mobile
echo.
echo 🚀 Utilisez [3] ou [M1] pour demarrer l'app mobile
pause
goto MAIN_MENU

rem ==========================================
rem  MAINTENANCE
rem ==========================================

:INSTALL_ALL
echo.
echo 📦 Installation All Dependencies
echo ==========================================
echo.

echo [1/4] Install Core...
cd /d "%~dp0\packages\core"
call npm install

echo [2/4] Install Web...
cd /d "%~dp0\packages\web"
call npm install

echo [3/4] Install Server...
cd /d "%~dp0\packages\server"
call npm install

echo [4/4] Install Mobile...
cd /d "%~dp0\packages\mobile"
call npm install

echo.
echo 🎉 ARCHITECTURE UNIVERSELLE PReTE !
echo.
echo ✅ Packages installes:
echo   → Core (logique metier)
echo   → Web (React + Vite)
echo   → Server (Express + SQLite)
echo   → Mobile (React Native + Expo)
echo.
echo 💡 Prochaine etape: Build Core avec [6]
pause
goto MAIN_MENU

:STOP_ALL
echo.
echo 🛑 Arret de tous les serveurs
echo ==========================================
echo.

echo Arret processus Node.js (API + Web + Expo)...
taskkill /F /IM node.exe 2>nul

echo Arret processus Metro Bundler...
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq *Metro*" 2>nul
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq *Expo*" 2>nul

echo.
echo  TOUS LES SERVEURS ARReTeS !
echo   → API Server (Express)
echo   → Web Dev Server (Vite)
echo   → Mobile Server (Expo)
echo   → Metro Bundler (React Native)
pause
goto MAIN_MENU

:MAINTENANCE
echo.
echo 🧹 Lancement du script de Maintenance Avancee
echo ==========================================
echo.
echo ⚠️  ATTENTION: Le script de maintenance contient des operations destructives
echo   → Nettoyage builds (safe)
echo   → Suppression dependances (dangereux)
echo   → Reinstallation packages
echo   → Options "NUKE ALL" (très dangereux)
echo.
echo 💡 Confirmations multiples requises pour les operations dangereuses
echo.
pause
call maintenance.bat
goto MAIN_MENU

:QUIT
echo.
echo 👋 Au revoir !
cd /d "%~dp0"
exit

rem ==========================================
rem  FIN DU SCRIPT
rem ==========================================