@echo off
rem ==========================================
rem  Configuration des ports - Gestion Chantier
rem ==========================================

echo Configuration actuelle:
echo.
echo API Port: 3001
echo Web Dev: 5173
echo Web Preview: 4173
echo.

:MENU
echo [1] Changer port API
echo [2] Voir configuration actuelle
echo [3] Reset configuration par defaut
echo [Q] Quitter
echo.
set /p choice=Choix : 

if /I "%choice%"=="1" goto CHANGE_API
if /I "%choice%"=="2" goto SHOW_CONFIG
if /I "%choice%"=="3" goto RESET_CONFIG
if /I "%choice%"=="Q" exit

goto MENU

:CHANGE_API
echo.
set /p newport=Nouveau port API (actuel: 3001) : 
if "%newport%"=="" goto MENU

echo Mise a jour de la configuration...
rem Mise à jour du .env
echo PORT=%newport%> .env.tmp
echo API_PORT=%newport%>> .env.tmp
echo AUTH_MODE=dev>> .env.tmp
echo DB_NAME=users.db>> .env.tmp
echo VITE_API_URL=http://localhost:%newport%>> .env.tmp
echo NODE_ENV=development>> .env.tmp
move .env.tmp .env

echo.
echo ✅ Configuration mise a jour !
echo   API Port: %newport%
echo   URL Web: http://localhost:%newport%
echo.
echo ⚠️  Pensez a relancer vos serveurs pour appliquer les changements
pause
goto MENU

:SHOW_CONFIG
echo.
echo === Configuration actuelle ===
type .env
echo.
pause
goto MENU

:RESET_CONFIG
echo.
echo Reset vers configuration par defaut...
echo PORT=3001> .env
echo API_PORT=3001>> .env
echo AUTH_MODE=dev>> .env
echo DB_NAME=users.db>> .env
echo VITE_API_URL=http://localhost:3001>> .env
echo NODE_ENV=development>> .env
echo.
echo ✅ Configuration resetee !
pause
goto MENU