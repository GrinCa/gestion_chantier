@echo off
:MENU
cls
echo ================================
echo   Vite Project - Menu
echo ================================
echo [1] Install + Build + Preview
echo [2] Build seulement
echo [3] Preview (lancer serveur dist)
echo [4] Dev (watch auto + hot reload)
echo [Q] Quitter
echo ================================
set /p choice=Choix : 

if /I "%choice%"=="1" goto FULL
if /I "%choice%"=="2" goto BUILD
if /I "%choice%"=="3" goto PREVIEW
if /I "%choice%"=="4" goto DEV
if /I "%choice%"=="Q" exit

goto MENU

:FULL
call npm install
call npm run build
call npm run preview
pause
goto MENU

:BUILD
call npm run build
pause
goto MENU

:PREVIEW
call npm run preview
pause
goto MENU

:DEV
rem Mode dev accessible depuis mobile (écoute sur toutes interfaces)
call npm run dev -- --host
pause
goto MENU