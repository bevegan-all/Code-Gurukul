@echo off
echo ============================================================
echo   CodeGurukul - Step 9: Restart Backend Server
echo ============================================================
echo.

:: Kill anything on port 5000
echo [1/2] Killing any process on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do (
    echo    Killing PID %%a...
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 >nul
echo      [OK] Port 5000 cleared.

:: Start backend
echo [2/2] Starting backend server...
cd /d "%~dp0..\backend"
echo (Running: npm start — press Ctrl+C to stop)
echo.
npm start
