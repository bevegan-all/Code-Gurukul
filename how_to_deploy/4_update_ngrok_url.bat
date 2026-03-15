@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   CodeGurukul - Step 4: Update ngrok URL Everywhere
echo ============================================================
echo.
echo  This script updates the ngrok URL in ALL config files so
echo  the Windows app, frontend, and backend all point to your
echo  current ngrok tunnel.
echo.
echo  WHERE TO FIND YOUR NGROK URL:
echo    - Run server_start.bat first (it starts ngrok automatically)
echo    - Then open browser: http://127.0.0.1:4040
echo    - OR check the terminal output from server_start.bat
echo    - The URL looks like: https://abc-xyz-123.ngrok-free.app
echo.
echo ============================================================
echo.

set /p NGROK_URL=Paste your ngrok URL here (no trailing slash): 

:: Strip trailing slash if present
if "!NGROK_URL:~-1!"=="/" set NGROK_URL=!NGROK_URL:~0,-1!

if "!NGROK_URL!"=="" (
    echo [ERROR] No URL entered. Exiting.
    pause
    exit /b 1
)

:: Validate it starts with https
echo !NGROK_URL! | findstr /i "^https://" >nul
if %errorlevel% neq 0 (
    echo [WARN] URL doesn't start with https:// — double-check it's correct.
    set /p CONFIRM=Continue anyway? (y/N): 
    if /i not "!CONFIRM!"=="y" exit /b 1
)

echo.
echo Updating with URL: !NGROK_URL!
echo.

:: ── 1. windows-app/src/config.js ────────────────────────────────────────────
echo [1/4] Updating windows-app/src/config.js ...
set CONFIG_FILE=%~dp0..\windows-app\src\config.js
(
echo export const API_URL = import.meta.env.VITE_API_URL ^|^| '!NGROK_URL!/api';
echo export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ^|^| '!NGROK_URL!';
) > "%CONFIG_FILE%"
echo      [OK] windows-app/src/config.js updated.

:: ── 2. backend/config/tunnel_url.json ───────────────────────────────────────
echo [2/4] Updating backend/config/tunnel_url.json ...
set TUNNEL_FILE=%~dp0..\backend\config\tunnel_url.json
if not exist "%~dp0..\backend\config" mkdir "%~dp0..\backend\config"
(
echo {"apiUrl":"!NGROK_URL!"}
) > "%TUNNEL_FILE%"
echo      [OK] backend/config/tunnel_url.json updated.

:: ── 3. frontend/.env.local (for local dev testing) ──────────────────────────
echo [3/4] Updating frontend/.env.local ...
set FRONTEND_ENV=%~dp0..\frontend\.env.local
(
echo VITE_API_URL=!NGROK_URL!/api
echo VITE_SOCKET_URL=!NGROK_URL!
) > "%FRONTEND_ENV%"
echo      [OK] frontend/.env.local updated.

:: ── 4. Print Vercel instruction ──────────────────────────────────────────────
echo [4/4] Vercel update (manual step required):
echo.
echo   ┌──────────────────────────────────────────────────────────────┐
echo   │  VERCEL: Update environment variable manually               │
echo   │                                                              │
echo   │  1. Go to: https://vercel.com/dashboard                    │
echo   │  2. Open your project settings                              │
echo   │  3. Environment Variables →  find VITE_API_URL             │
echo   │  4. Set value to: !NGROK_URL!/api
echo   │  5. Click Save → Deployments → Redeploy latest             │
echo   └──────────────────────────────────────────────────────────────┘

echo.
echo ============================================================
echo   All config files updated with ngrok URL:
echo   !NGROK_URL!
echo.
echo   IMPORTANT: If you rebuilt the Windows app previously with
echo   an old URL, you must rebuild it now:
echo   → Run: 7_build_windows_app.bat
echo ============================================================
pause
