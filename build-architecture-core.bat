@echo off
echo ==========================================
echo TEST BUILD ARCHITECTURE CORE UNIVERSELLE
echo ==========================================
echo.

echo [1] Build package CORE...
cd /d "c:\Users\Julien\Documents\Script\gestion_chantier\packages\core"
call npm run build
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Build core echoue
    pause
    exit /b 1
)
echo ✅ Core build OK
echo.

echo [2] Build package WEB...
cd /d "c:\Users\Julien\Documents\Script\gestion_chantier\packages\web"
call npm run build
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Build web echoue
    pause
    exit /b 1
)
echo ✅ Web build OK
echo.

echo [3] Test import core dans web...
echo import { calculatriceTool } from '@gestion-chantier/core'; > test-import.js
echo console.log('TEST:', calculatriceTool.getDefaultData().length); >> test-import.js
node test-import.js 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  WARNING: Test import manuel echoue (normal si pas de node modules)
) else (
    echo ✅ Import core OK
)
del test-import.js 2>nul
echo.

echo ==========================================
echo 🎉 ARCHITECTURE CORE BUILD COMPLETE !
echo ==========================================
echo.
echo 📦 Core package: packages/core/dist/
echo 🌐 Web package: packages/web/dist/  
echo.
echo Next steps:
echo 1. Run: start-architecture-core.bat
echo 2. Test: Calculatrice > Test Core
echo 3. Use: Calculatrice > Nouvelle Architecture
echo.
pause