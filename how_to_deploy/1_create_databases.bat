@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   CodeGurukul - Step 1: Create Databases
echo ============================================================
echo.

:: ── Check PostgreSQL is running ─────────────────────────────────────────────
echo [1/4] Starting PostgreSQL service...
net start "postgresql-x64-15" 2>nul
if %errorlevel% neq 0 (
    echo    Already running or service name differs — trying fallback...
    net start postgresql 2>nul
)
timeout /t 2 >nul

:: ── Create PostgreSQL database ──────────────────────────────────────────────
echo [2/4] Creating PostgreSQL database "codegurukul"...
set PGPASSWORD=postgres
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='codegurukul';" 2>nul | findstr "1 row" >nul
if %errorlevel% equ 0 (
    echo    Database "codegurukul" already exists. Skipping.
) else (
    psql -U postgres -c "CREATE DATABASE codegurukul ENCODING 'UTF8';"
    if %errorlevel% equ 0 (
        echo    [OK] Database "codegurukul" created.
    ) else (
        echo    [ERROR] Failed to create database. Check PostgreSQL is running and password is "postgres".
        goto :error
    )
)

:: ── Start MongoDB ────────────────────────────────────────────────────────────
echo [3/4] Starting MongoDB service...
net start MongoDB 2>nul
if %errorlevel% neq 0 (
    echo    MongoDB already running or start failed — continuing.
)
timeout /t 2 >nul
echo    [OK] MongoDB ready (database created automatically on first use).

:: ── Install backend dependencies + run seed ─────────────────────────────────
echo [4/4] Running database seed (creates admin user + default data)...
cd /d "%~dp0..\backend"
if not exist "node_modules" (
    echo    node_modules not found — installing dependencies first...
    npm install
)
node scripts\seed_admin.js
if %errorlevel% equ 0 (
    echo    [OK] Seed complete.
) else (
    echo    [WARN] Seed had errors — check output above. You may need to run again.
)

echo.
echo ============================================================
echo   Databases ready!
echo   PostgreSQL: codegurukul (localhost:5432)
echo   MongoDB:    codegurukul (localhost:27017)
echo ============================================================
pause
exit /b 0

:error
echo.
echo [FAILED] Database creation failed. See errors above.
pause
exit /b 1
