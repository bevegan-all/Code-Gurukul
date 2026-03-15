@echo off
echo ===================================================
echo CodeGurukul Compiler Installer
echo ===================================================

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrative privileges confirmed.
) else (
    echo [ERROR] Please run this script as Administrator.
    pause
    exit /b 1
)

:: Install Go
echo [1/3] Checking for Go...
go version >nul 2>&1
if %errorLevel% == 0 (
    echo Go is already installed.
) else (
    echo Installing Go Lang...
    winget install -e --id GoLang.Go
    if %errorLevel% neq 0 (
        echo [!] Winget install failed. Downloading manually is recommended if this persists.
    )
)

:: Install R
echo [2/3] Checking for R...
R --version >nul 2>&1
if %errorLevel% == 0 (
    echo R is already installed.
) else (
    echo Installing R Programming...
    winget install -e --id RProject.R
)

:: HBase (Usually requires Java and manual setup, but we'll try to check if it's there)
echo [3/3] HBase note: HBase requires manual Hadoop/Java configuration.
echo Ensure HBASE_HOME is in your PATH to use 'hbase shell' commands.

echo.
echo ===================================================
echo Installation steps completed.
echo Please RESTART your terminal/IDE to refresh PATH variables.
echo ===================================================
pause
