@echo off
setlocal EnableDelayedExpansion

echo ╔══════════════════════════════════════════════════════════════╗
echo ║     CodeGurukul — Full Fresh Deployment (First Time)        ║
echo ║     This runs ALL setup steps in order automatically        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This script will:
echo    1. Check prerequisites (Node, PostgreSQL, MongoDB, ngrok)
echo    2. Create databases
echo    3. Install all npm dependencies
echo    4. Configure environment variables
echo    5. Seed the database (create admin account)
echo    6. Start the server + ngrok
echo    7. Prompt you to update the ngrok URL
echo.
echo  Estimated time: 5-10 minutes
echo.
set /p START=Press Enter to begin (or Ctrl+C to cancel)...

echo.
echo ════════════════════════════════════════════════════════════════
echo  CHECKING PREREQUISITES
echo ════════════════════════════════════════════════════════════════

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo         Download from: https://nodejs.org/en/download
    echo         Install LTS version, then run this script again.
    pause
    exit /b 1
) else (
    for /f %%v in ('node --version') do echo [OK] Node.js %%v found.
)

:: Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Git not found. Install from: https://git-scm.com/download/win
) else (
    for /f %%v in ('git --version') do echo [OK] %%v found.
)

:: Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL (psql) not found in PATH!
    echo         Install PostgreSQL 15 from:
    echo         https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo         Then add C:\Program Files\PostgreSQL\15\bin to your PATH.
    pause
    exit /b 1
) else (
    for /f %%v in ('psql --version') do echo [OK] %%v found.
)

:: Check MongoDB
mongosh --version >nul 2>&1
if %errorlevel% neq 0 (
    mongod --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] MongoDB not found!
        echo         Install from: https://www.mongodb.com/try/download/community
        pause
        exit /b 1
    ) else (
        echo [OK] MongoDB binary found.
    )
) else (
    for /f %%v in ('mongosh --version') do echo [OK] mongosh %%v found.
)

:: Check ngrok
if exist "%~dp0..\ngrok.exe" (
    echo [OK] ngrok.exe found in project root.
) else (
    echo [WARN] ngrok.exe not found in Code Gurukul root folder.
    echo        Download from https://ngrok.com/download and place ngrok.exe there.
)

echo.
echo ════════════════════════════════════════════════════════════════
echo  STEP 1 OF 5: Creating databases...
echo ════════════════════════════════════════════════════════════════
call "%~dp01_create_databases.bat"

echo.
echo ════════════════════════════════════════════════════════════════
echo  STEP 2 OF 5: Setting up environment variables...
echo ════════════════════════════════════════════════════════════════
if not exist "%~dp0..\backend\.env" (
    call "%~dp02_setup_env.bat"
) else (
    echo [OK] backend\.env already exists. Skipping setup.
)

echo.
echo ════════════════════════════════════════════════════════════════
echo  STEP 3 OF 5: Installing npm dependencies...
echo ════════════════════════════════════════════════════════════════
call "%~dp03_install_dependencies.bat"

echo.
echo ════════════════════════════════════════════════════════════════
echo  STEP 4 OF 5: Starting server + ngrok...
echo ════════════════════════════════════════════════════════════════
echo.
echo  The server will now start in a new window.
echo  After it starts, check: http://127.0.0.1:4040 for the ngrok URL.
echo  Come back to THIS window to continue.
echo.
start "CodeGurukul Server" cmd /k "cd /d %~dp0.. && server_start.bat"
echo.
echo Waiting 10 seconds for server to start...
timeout /t 10 >nul

echo.
echo ════════════════════════════════════════════════════════════════
echo  STEP 5 OF 5: Update ngrok URL
echo ════════════════════════════════════════════════════════════════
echo.
echo  The server window should now show the ngrok URL.
echo  Also check: http://127.0.0.1:4040
echo.
call "%~dp04_update_ngrok_url.bat"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                 DEPLOYMENT COMPLETE!                        ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Backend : http://localhost:5000/api/health                 ║
echo ║  Frontend: Run 8_start_frontend_dev.bat → localhost:5173    ║
echo ║  Student : Run 5_test_windows_app.bat                       ║
echo ║                                                              ║
echo ║  Admin Login:                                                ║
echo ║    Email:    admin@codegurukul.dev                          ║
echo ║    Password: admin                                           ║
echo ║                                                              ║
echo ║  NEXT STEPS:                                                 ║
echo ║  - Deploy frontend to Vercel (see DEPLOYMENT_GUIDE.txt)     ║
echo ║  - Build Windows app: 7_build_windows_app.bat               ║
echo ║  - Push to GitHub: 6_push_to_github.bat                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
