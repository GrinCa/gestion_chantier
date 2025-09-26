@echo off
echo ====================================
echo GESTION CHANTIER - Architecture Core
echo ====================================
echo.

echo [1] Demarrage serveur API (port 3001)...
cd /d "c:\Users\Julien\Documents\Script\gestion_chantier\packages\server"
start "API Server" cmd /k "node index.js"

echo [2] Attente serveur API...
timeout /t 3 /nobreak >nul

echo [3] Demarrage serveur Web (port 5173)...
cd /d "c:\Users\Julien\Documents\Script\gestion_chantier\packages\web"
start "Web Dev Server" cmd /k "npm run dev"

echo [4] Attente serveur Web...
timeout /t 5 /nobreak >nul

echo [5] Ouverture navigateur...
start "Browser" "http://localhost:5173"

echo.
echo ✅ ARCHITECTURE CORE DEMARRE !
echo.
echo 🌐 Web: http://localhost:5173
echo 🔌 API: http://localhost:3001
echo.
echo 🧪 Test: Aller dans Calculatrice > Test Core
echo ✅ Core: Aller dans Calculatrice > Nouvelle Architecture
echo 📦 Legacy: Aller dans Calculatrice > Ancienne Version
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul