@echo off
rem ==========================================
rem  GESTION CHANTIER - Maintenance Avancée
rem ==========================================
rem ⚠️  ATTENTION: Opérations destructives !

:MAIN_MENU
cls
echo ==========================================
echo   MAINTENANCE AVANCÉE - GESTION CHANTIER
echo ==========================================
echo.
echo ⚠️  ATTENTION: OPÉRATIONS DESTRUCTIVES !
echo.
echo 🧹 NETTOYAGE:
echo [1] Clean Core (dist seulement)
echo [2] Clean Web (dist seulement)
echo [3] Clean Mobile (web-build seulement)
echo [4] Clean ALL Builds (tous les dist)
echo.
echo 💥 NETTOYAGE COMPLET (DANGEREUX):
echo [D1] Clean Core Dependencies (node_modules)
echo [D2] Clean Web Dependencies (node_modules)
echo [D3] Clean Mobile Dependencies (node_modules)
echo [D4] Clean Server Dependencies (node_modules)
echo [D5] 🚨 NUKE ALL - Tout supprimer (builds + deps)
echo.
echo 🔄 RÉINSTALLATION:
echo [R1] Reinstall Core
echo [R2] Reinstall Web
echo [R3] Reinstall Mobile
echo [R4] Reinstall Server
echo [R5] Reinstall All
echo.
echo [B] Retour au script principal
echo [Q] Quitter
echo ==========================================
set /p choice=⚠️  Choix MAINTENANCE : 

if /I "%choice%"=="1" goto CLEAN_CORE_DIST
if /I "%choice%"=="2" goto CLEAN_WEB_DIST
if /I "%choice%"=="3" goto CLEAN_MOBILE_DIST
if /I "%choice%"=="4" goto CLEAN_ALL_DIST
if /I "%choice%"=="D1" goto CLEAN_CORE_DEPS
if /I "%choice%"=="D2" goto CLEAN_WEB_DEPS
if /I "%choice%"=="D3" goto CLEAN_MOBILE_DEPS
if /I "%choice%"=="D4" goto CLEAN_SERVER_DEPS
if /I "%choice%"=="D5" goto NUKE_ALL
if /I "%choice%"=="R1" goto REINSTALL_CORE
if /I "%choice%"=="R2" goto REINSTALL_WEB
if /I "%choice%"=="R3" goto REINSTALL_MOBILE
if /I "%choice%"=="R4" goto REINSTALL_SERVER
if /I "%choice%"=="R5" goto REINSTALL_ALL
if /I "%choice%"=="B" goto BACK_TO_MAIN
if /I "%choice%"=="Q" goto QUIT

goto MAIN_MENU

rem ==========================================
rem  NETTOYAGE BUILD SEULEMENT (SAFE)
rem ==========================================

:CLEAN_CORE_DIST
echo.
echo 🧹 Nettoyage Core (dist seulement)
echo ==========================================
cd /d "%~dp0"
if exist "packages\core\dist" (
    rmdir /s /q "packages\core\dist"
    echo ✅ Core dist supprimé
) else (
    echo ℹ️  Pas de dist à nettoyer
)
pause
goto MAIN_MENU

:CLEAN_WEB_DIST
echo.
echo 🧹 Nettoyage Web (dist seulement)
echo ==========================================
cd /d "%~dp0"
if exist "packages\web\dist" (
    rmdir /s /q "packages\web\dist"
    echo ✅ Web dist supprimé
) else (
    echo ℹ️  Pas de dist à nettoyer
)
pause
goto MAIN_MENU

:CLEAN_MOBILE_DIST
echo.
echo 🧹 Nettoyage Mobile (web-build seulement)
echo ==========================================
cd /d "%~dp0"
if exist "packages\mobile\web-build" (
    rmdir /s /q "packages\mobile\web-build"
    echo ✅ Mobile web-build supprimé
) else (
    echo ℹ️  Pas de web-build à nettoyer
)
pause
goto MAIN_MENU

:CLEAN_ALL_DIST
echo.
echo 🧹 Nettoyage ALL Builds
echo ==========================================
cd /d "%~dp0"
echo Suppression des builds...
if exist "packages\core\dist" rmdir /s /q "packages\core\dist"
if exist "packages\web\dist" rmdir /s /q "packages\web\dist"
if exist "packages\mobile\web-build" rmdir /s /q "packages\mobile\web-build"
echo ✅ Tous les builds supprimés
pause
goto MAIN_MENU

rem ==========================================
rem  NETTOYAGE DEPENDENCIES (DANGEREUX)
rem ==========================================

:CLEAN_CORE_DEPS
echo.
echo 💥 ATTENTION: Suppression dependencies Core
echo ==========================================
echo ⚠️  Cela va supprimer packages\core\node_modules
echo.
set /p confirm=❓ Confirmer la suppression ? (tapez OUI en majuscules) : 
if not "%confirm%"=="OUI" (
    echo ❌ Annulé
    pause
    goto MAIN_MENU
)
cd /d "%~dp0"
if exist "packages\core\node_modules" (
    rmdir /s /q "packages\core\node_modules"
    echo ✅ Core node_modules supprimé
) else (
    echo ℹ️  Pas de node_modules à supprimer
)
pause
goto MAIN_MENU

:CLEAN_WEB_DEPS
echo.
echo 💥 ATTENTION: Suppression dependencies Web
echo ==========================================
echo ⚠️  Cela va supprimer packages\web\node_modules
echo.
set /p confirm=❓ Confirmer la suppression ? (tapez OUI en majuscules) : 
if not "%confirm%"=="OUI" (
    echo ❌ Annulé
    pause
    goto MAIN_MENU
)
cd /d "%~dp0"
if exist "packages\web\node_modules" (
    rmdir /s /q "packages\web\node_modules"
    echo ✅ Web node_modules supprimé
) else (
    echo ℹ️  Pas de node_modules à supprimer
)
pause
goto MAIN_MENU

:CLEAN_MOBILE_DEPS
echo.
echo 💥 ATTENTION: Suppression dependencies Mobile
echo ==========================================
echo ⚠️  Cela va supprimer packages\mobile\node_modules
echo.
set /p confirm=❓ Confirmer la suppression ? (tapez OUI en majuscules) : 
if not "%confirm%"=="OUI" (
    echo ❌ Annulé
    pause
    goto MAIN_MENU
)
cd /d "%~dp0"
if exist "packages\mobile\node_modules" (
    rmdir /s /q "packages\mobile\node_modules"
    echo ✅ Mobile node_modules supprimé
) else (
    echo ℹ️  Pas de node_modules à supprimer
)
pause
goto MAIN_MENU

:CLEAN_SERVER_DEPS
echo.
echo 💥 ATTENTION: Suppression dependencies Server
echo ==========================================
echo ⚠️  Cela va supprimer packages\server\node_modules
echo.
set /p confirm=❓ Confirmer la suppression ? (tapez OUI en majuscules) : 
if not "%confirm%"=="OUI" (
    echo ❌ Annulé
    pause
    goto MAIN_MENU
)
cd /d "%~dp0"
if exist "packages\server\node_modules" (
    rmdir /s /q "packages\server\node_modules"
    echo ✅ Server node_modules supprimé
) else (
    echo ℹ️  Pas de node_modules à supprimer
)
pause
goto MAIN_MENU

:NUKE_ALL
echo.
echo 🚨 NUKE ALL - SUPPRESSION TOTALE
echo ==========================================
echo ⚠️  ATTENTION: CETTE OPÉRATION VA TOUT SUPPRIMER !
echo.
echo 📁 Builds qui seront supprimés:
echo   → packages\core\dist
echo   → packages\web\dist
echo   → packages\mobile\web-build
echo.
echo 📦 Dependencies qui seront supprimées:
echo   → packages\core\node_modules
echo   → packages\web\node_modules
echo   → packages\mobile\node_modules
echo   → packages\server\node_modules
echo.
echo 🔥 CETTE ACTION EST IRRÉVERSIBLE !
echo.
set /p confirm=❓ Pour confirmer, tapez "DELETE EVERYTHING" : 
if not "%confirm%"=="DELETE EVERYTHING" (
    echo ❌ Opération annulée - Saisie incorrecte
    pause
    goto MAIN_MENU
)

echo.
echo 🚨 SUPPRESSION EN COURS...
cd /d "%~dp0"

echo [1/7] Suppression builds...
if exist "packages\core\dist" rmdir /s /q "packages\core\dist"
if exist "packages\web\dist" rmdir /s /q "packages\web\dist"
if exist "packages\mobile\web-build" rmdir /s /q "packages\mobile\web-build"

echo [2/7] Suppression Core dependencies...
if exist "packages\core\node_modules" rmdir /s /q "packages\core\node_modules"

echo [3/7] Suppression Web dependencies...
if exist "packages\web\node_modules" rmdir /s /q "packages\web\node_modules"

echo [4/7] Suppression Mobile dependencies...
if exist "packages\mobile\node_modules" rmdir /s /q "packages\mobile\node_modules"

echo [5/7] Suppression Server dependencies...
if exist "packages\server\node_modules" rmdir /s /q "packages\server\node_modules"

echo [6/7] Suppression package-lock files...
if exist "packages\core\package-lock.json" del /q "packages\core\package-lock.json"
if exist "packages\web\package-lock.json" del /q "packages\web\package-lock.json"
if exist "packages\mobile\package-lock.json" del /q "packages\mobile\package-lock.json"
if exist "packages\server\package-lock.json" del /q "packages\server\package-lock.json"

echo [7/7] Nettoyage terminé
echo.
echo 💥 TOUT A ÉTÉ SUPPRIMÉ !
echo.
echo 💡 Prochaines étapes recommandées:
echo   1. Utiliser [R5] Reinstall All
echo   2. Ou revenir au script principal et utiliser [I] Install All Dependencies
echo.
pause
goto MAIN_MENU

rem ==========================================
rem  RÉINSTALLATION
rem ==========================================

:REINSTALL_CORE
echo.
echo 🔄 Réinstallation Core
echo ==========================================
cd /d "%~dp0\packages\core"
call npm install
if %errorlevel%==0 (
    echo ✅ Core réinstallé avec succès
) else (
    echo ❌ Erreur lors de la réinstallation
)
pause
goto MAIN_MENU

:REINSTALL_WEB
echo.
echo 🔄 Réinstallation Web
echo ==========================================
cd /d "%~dp0\packages\web"
call npm install
if %errorlevel%==0 (
    echo ✅ Web réinstallé avec succès
) else (
    echo ❌ Erreur lors de la réinstallation
)
pause
goto MAIN_MENU

:REINSTALL_MOBILE
echo.
echo 🔄 Réinstallation Mobile
echo ==========================================
cd /d "%~dp0\packages\mobile"
call npm install
if %errorlevel%==0 (
    echo ✅ Mobile réinstallé avec succès
) else (
    echo ❌ Erreur lors de la réinstallation
)
pause
goto MAIN_MENU

:REINSTALL_SERVER
echo.
echo 🔄 Réinstallation Server
echo ==========================================
cd /d "%~dp0\packages\server"
call npm install
if %errorlevel%==0 (
    echo ✅ Server réinstallé avec succès
) else (
    echo ❌ Erreur lors de la réinstallation
)
pause
goto MAIN_MENU

:REINSTALL_ALL
echo.
echo 🔄 Réinstallation COMPLÈTE
echo ==========================================

echo [1/4] Réinstallation Core...
cd /d "%~dp0\packages\core"
call npm install

echo [2/4] Réinstallation Web...
cd /d "%~dp0\packages\web"
call npm install

echo [3/4] Réinstallation Mobile...
cd /d "%~dp0\packages\mobile"
call npm install

echo [4/4] Réinstallation Server...
cd /d "%~dp0\packages\server"
call npm install

echo.
echo ✅ RÉINSTALLATION COMPLÈTE TERMINÉE !
pause
goto MAIN_MENU

:BACK_TO_MAIN
cd /d "%~dp0"
call gestion-chantier.bat
exit

:QUIT
echo.
echo 👋 Maintenance terminée
cd /d "%~dp0"
exit

rem ==========================================
rem  FIN DU SCRIPT MAINTENANCE
rem ==========================================