@echo off
:MENU
cls
echo ==========================================
echo   Gestion Chantier - Development Menu
echo ==========================================
echo [1] Install + Build + Preview (Web)
echo [2] Build seulement (Web)
echo [3] Preview (serveur dist web)
echo [4] Dev Web (watch auto + hot reload)
echo [5] Start API Server seulement
echo [6] Dev Full Stack (API + Web ensemble)
echo [7] Build All (Core + Web)
echo [8] Stop All Servers
echo [Q] Quitter
echo ==========================================
set /p choice=Choix : 

if /I "%choice%"=="1" goto FULL
if /I "%choice%"=="2" goto BUILD
if /I "%choice%"=="3" goto PREVIEW
if /I "%choice%"=="4" goto DEV
if /I "%choice%"=="5" goto API
if /I "%choice%"=="6" goto FULLSTACK
if /I "%choice%"=="7" goto BUILDALL
if /I "%choice%"=="8" goto STOPALL
if /I "%choice%"=="Q" goto QUIT

goto MENU

:FULL
echo === Installation et build complet (Web) ===
cd packages\web
call npm install
call npm run build
call npm run preview
cd ..\..
pause
goto MENU

:BUILD
echo === Build Web seulement ===
cd packages\web
call npm run build
cd ..\..
pause
goto MENU

:PREVIEW
echo === Preview serveur dist ===
cd packages\web
call npm run preview
cd ..\..
pause
goto MENU

:DEV
echo === Mode dev Web (accessible mobile) ===
cd packages\web
rem Mode dev accessible depuis mobile (écoute sur toutes interfaces)
call npm run dev -- --host
cd ..\..
pause
goto MENU

:API
echo === Lancement API Server ===
cd packages\server
call node index.js
cd ..\..
pause
goto MENU

:FULLSTACK
echo === Lancement Full Stack (API + Web) ===
echo Demarrage API Server en arriere-plan...
start "API Gestion Chantier" cmd /c "cd packages\server && node index.js && pause"
timeout /t 3 /nobreak > nul
echo Demarrage Web Dev Server...
cd packages\web
call npm run dev -- --host
cd ..\..
pause
goto MENU

:BUILDALL
echo === Build complet (Core + Web) ===
echo Build Core...
cd packages\core
call npm run build
echo Build Web...
cd ..\web
call npm run build
cd ..\..
echo === Build terminé ===
pause
goto MENU

:STOPALL
echo === Arret de tous les serveurs ===
taskkill /F /IM node.exe 2>nul
echo Tous les processus Node.js ont ete arretes
pause
goto MENU

:QUIT
echo === Nettoyage et sortie ===
cd /d "%~dp0"
echo Retour au repertoire de base: %CD%
exit