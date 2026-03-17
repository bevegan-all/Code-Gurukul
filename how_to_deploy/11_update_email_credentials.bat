@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   CodeGurukul - Step 11: Update Gmail Credentials
echo ============================================================
echo.
echo  This script allows you to update the Gmail account used
echo  by the backend to send notification emails to students
echo  and teachers.
echo.
echo  PREREQUISITE:
echo    1. You must have a Gmail account.
echo    2. You MUST have "2-Step Verification" ENABLED.
echo    3. You MUST create an "App Password" (see DEPLOYMENT_GUIDE.txt).
echo ============================================================
echo.

set /p EMAIL_USER=Enter your Gmail address: 
set /p EMAIL_PASS=Enter your 16-character App Password (no spaces): 

if "!EMAIL_USER!"=="" (
    echo [ERROR] Email cannot be empty.
    pause
    exit /b 1
)

if "!EMAIL_PASS!"=="" (
    echo [ERROR] Password cannot be empty.
    pause
    exit /b 1
)

:: Validate email format (simple check)
echo !EMAIL_USER! | findstr /i "@gmail.com" >nul
if %errorlevel% neq 0 (
    echo [WARN] This looks like it might not be a Gmail address.
    echo        Nodemailer is configured for Gmail by default.
)

set ENV_FILE=%~dp0..\backend\.env

if not exist "%ENV_FILE%" (
    echo [ERROR] backend\.env not found! Run 2_setup_env.bat first.
    pause
    exit /b 1
)

echo.
echo Updating credentials in backend\.env ...

:: We use a temporary file to rebuild the .env while replacing specific lines
set TEMP_ENV=%~dp0..\backend\.env.tmp
(
    for /f "tokens=1* delims==" %%a in ('type "%ENV_FILE%"') do (
        set "line_key=%%a"
        set "line_val=%%b"
        
        if "!line_key!"=="EMAIL_USER" (
            echo EMAIL_USER=!EMAIL_USER!
        ) else if "!line_key!"=="EMAIL_PASS" (
            echo EMAIL_PASS=!EMAIL_PASS!
        ) else if "!line_key!"=="EMAIL_FROM" (
            echo EMAIL_FROM="CodeGurukul Admin" ^<!EMAIL_USER!^>
        ) else (
            if "!line_val!"=="" (
                echo !line_key!=
            ) else (
                echo !line_key!=!line_val!
            )
        )
    )
) > "%TEMP_ENV%"

move /y "%TEMP_ENV%" "%ENV_FILE%" >nul

echo.
echo [OK] Gmail credentials updated successfully!
echo      New sender address: !EMAIL_USER!
echo.
echo IMPORTANT: You must restart the backend server for these
echo            changes to take effect.
echo.
pause
