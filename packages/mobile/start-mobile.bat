@echo off
rem Script de lancement Expo Mobile - Gestion Chantier
echo 📱 Lancement Expo Mobile...
echo.

rem Vérification du répertoire
if not exist "package.json" (
    echo ❌ Erreur: Ce script doit être exécuté depuis packages/mobile
    pause
    exit /b 1
)

rem Vérification du core buildé
if not exist "..\core\dist\index.js" (
    echo ⚠️  Core non buildé - Build en cours...
    cd ..\core
    call npm run build
    cd ..\mobile
)

echo ✅ Démarrage serveur Expo...
echo.
echo 💡 UTILISATION:
echo   → Scanner QR code avec Expo Go
echo   → Presser 'w' pour web
echo   → Presser 'a' pour Android
echo   → Presser 'i' pour iOS
echo.

call npx expo start

pause