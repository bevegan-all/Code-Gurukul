@echo off
echo ============================================================
echo   CodeGurukul - Step 3: Install All npm Dependencies
echo ============================================================
echo.

:: ── Backend ─────────────────────────────────────────────────────────────────
echo [1/3] Installing backend dependencies...
cd /d "%~dp0..\backend"
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed!
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.
echo.

:: ── Frontend ─────────────────────────────────────────────────────────────────
echo [2/3] Installing frontend dependencies...
cd /d "%~dp0..\frontend"
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed!
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

:: ── Windows App ─────────────────────────────────────────────────────────────
echo [3/3] Installing windows-app dependencies...
cd /d "%~dp0..\windows-app"
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Windows-app npm install failed!
    pause
    exit /b 1
)
echo [OK] Windows-app dependencies installed.

echo.
echo ============================================================
echo   All dependencies installed successfully!
echo   Next: Run 4_update_ngrok_url.bat after starting ngrok
echo ============================================================
pause
