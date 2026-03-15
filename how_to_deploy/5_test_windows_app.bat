@echo off
echo ============================================================
echo   CodeGurukul - Step 5: Test Windows (Student) App
echo ============================================================
echo.
echo  This launches the Electron app in development mode.
echo  The app should open in kiosk/fullscreen mode.
echo  Login with a student account to test.
echo.
echo  PREREQUISITE: Backend server must be running first!
echo  (Run server_start.bat if not already started)
echo.
pause

cd /d "%~dp0..\windows-app"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    npm install
)

echo.
echo Starting Electron app in development mode...
echo (Press Ctrl+C in this window to stop)
echo.
npm run dev
