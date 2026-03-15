@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   CodeGurukul - Step 2: Setup Environment Variables
echo ============================================================
echo.

set ENV_FILE=%~dp0..\backend\.env

if exist "%ENV_FILE%" (
    echo [INFO] backend\.env already exists.
    echo        Edit it manually if you need to change values.
    echo.
    echo Current content:
    echo ──────────────────────
    type "%ENV_FILE%"
    echo ──────────────────────
    echo.
    set /p OVERWRITE=Overwrite with fresh template? (y/N): 
    if /i not "!OVERWRITE!"=="y" (
        echo Keeping existing .env file.
        pause
        exit /b 0
    )
)

:: ──── Collect values from user ──────────────────────────────────────────────
echo.
echo Fill in the values below (press Enter to use defaults shown in brackets):
echo.

set /p PG_PASS=PostgreSQL password [default: postgres]: 
if "!PG_PASS!"=="" set PG_PASS=postgres

set /p PG_DB=PostgreSQL database name [default: codegurukul]: 
if "!PG_DB!"=="" set PG_DB=codegurukul

set /p JWT_SECRET=JWT Secret (random string) [default: changeme_in_production]: 
if "!JWT_SECRET!"=="" set JWT_SECRET=changeme_in_production

set /p GEMINI_KEY=Gemini API Key 1 (from ai.google.dev) [leave blank to skip]: 

set /p EMAIL_USER=Gmail address for sending emails [leave blank to skip]: 
set /p EMAIL_PASS=Gmail App Password [leave blank to skip]: 

set /p ADMIN_EMAIL=Admin email [default: admin@codegurukul.dev]: 
if "!ADMIN_EMAIL!"=="" set ADMIN_EMAIL=admin@codegurukul.dev

set /p ADMIN_PASS=Admin password [default: admin]: 
if "!ADMIN_PASS!"=="" set ADMIN_PASS=admin

:: ──── Write .env file ────────────────────────────────────────────────────────
echo.
echo Writing backend\.env ...

(
echo # Database
echo PG_HOST=localhost
echo PG_PORT=5432
echo PG_USER=postgres
echo PG_PASSWORD=!PG_PASS!
echo PG_DATABASE=!PG_DB!
echo MONGO_URI=mongodb://localhost:27017/codegurukul
echo.
echo # Server
echo PORT=5000
echo NODE_ENV=development
echo.
echo # JWT
echo JWT_SECRET=!JWT_SECRET!
echo JWT_REFRESH_SECRET=!JWT_SECRET!_refresh
echo JWT_EXPIRES_IN=15m
echo JWT_REFRESH_EXPIRES_IN=7d
echo.
echo # Gemini API Keys (round-robin)
echo GEMINI_KEY_1=!GEMINI_KEY!
echo GEMINI_KEY_2=
echo GEMINI_KEY_3=
echo GEMINI_KEY_4=
echo.
echo # Email (Gmail via Nodemailer)
echo EMAIL_USER=!EMAIL_USER!
echo EMAIL_PASS=!EMAIL_PASS!
echo EMAIL_FROM="CodeGurukul Admin" ^<!EMAIL_USER!^>
echo.
echo # Admin defaults
echo ADMIN_EMAIL=!ADMIN_EMAIL!
echo ADMIN_PASSWORD=!ADMIN_PASS!
echo.
echo # Code execution
echo CODE_EXECUTION_TIMEOUT=30000
echo CODE_SANDBOX_DIR=./tmp/sandbox
) > "%ENV_FILE%"

echo.
echo [OK] backend\.env created successfully!
echo.
echo ============================================================
echo  NEXT STEP: Get your ngrok URL and run 4_update_ngrok_url.bat
echo ============================================================
pause
