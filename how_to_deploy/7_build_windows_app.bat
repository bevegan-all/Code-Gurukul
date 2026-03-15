@echo off
echo ============================================================
echo   CodeGurukul - Step 7: Build Windows App for Distribution
echo ============================================================
echo.
echo  This builds the student Electron app into an installer .exe
echo  that can be distributed and installed on student PCs.
echo.
echo  IMPORTANT CHECKLIST before building:
echo  ─────────────────────────────────────────────────────────
echo   [?] Is windows-app/src/config.js pointing to the correct
echo       ngrok URL? (Run 4_update_ngrok_url.bat if not sure)
echo.
echo   The ngrok URL is BAKED INTO the build. Students will use
echo   whatever URL is in config.js at the time of this build.
echo   If the URL changes later, rebuild and redistribute.
echo  ─────────────────────────────────────────────────────────
echo.

set /p CONFIRM=Confirm config.js has the correct URL and proceed? (y/N): 
if /i not "%CONFIRM%"=="y" (
    echo Cancelled. Run 4_update_ngrok_url.bat first, then come back.
    pause
    exit /b 0
)

cd /d "%~dp0..\windows-app"

echo.
echo [1/2] Installing dependencies (if needed)...
if not exist "node_modules" npm install

echo.
echo [2/2] Building Electron app...
echo (This may take 2-5 minutes)
npm run build

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   BUILD SUCCESSFUL!
    echo   Installer location: windows-app\release\
    echo.
    echo   Files to distribute to student PCs:
    echo     - The .exe installer file in the release folder
    echo.
    echo   After installing on student PC:
    echo     - Launch "CodeGurukul" from Start Menu or Desktop
    echo     - App opens in kiosk mode automatically
    echo ============================================================
    explorer "%~dp0..\windows-app\release"
) else (
    echo.
    echo ============================================================
    echo   BUILD FAILED. Common fixes:
    echo   1. Run: npm install  in windows-app folder
    echo   2. Check electron-builder is installed: npm install -D electron-builder
    echo   3. Make sure you're not running the app while building
    echo ============================================================
)
pause
