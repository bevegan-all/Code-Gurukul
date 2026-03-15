@echo off
setlocal EnableDelayedExpansion
title CodeGurukul - Comprehensive Compiler & Environment Installer
color 0A

echo ============================================================
echo   CodeGurukul - Full Environment Setup
echo   This will install all compilers, interpreters, and DBs
echo ============================================================
echo.

:: ── Check for Administrative privileges ────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please run this script as Administrator (Right click -^> Run as Administrator).
    pause
    exit /b 1
)

echo [INFO] Administrative privileges confirmed.
echo.

:: ── 1. Node.js (JavaScript/Server) ──────────────────────────────────────────
echo [1/10] Checking Node.js...
node -v >nul 2>&1
if %errorLevel% == 0 (
    echo Node.js is already installed.
) else (
    echo Installing Node.js LTS...
    winget install -e --id OpenJS.NodeJS.LTS
)

:: ── 2. Python 3 + Libraries ───────────────────────────────────────────────
echo [2/10] Checking Python...
python --version >nul 2>&1
if %errorLevel% == 0 (
    echo Python is already installed.
) else (
    echo Installing Python 3...
    winget install -e --id Python.Python.3.11
    :: Refresh path for current session
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts"
)
echo Installing Python Libraries (matplotlib, numpy, pandas)...
python -m pip install --upgrade pip
python -m pip install matplotlib numpy pandas

:: ── 3. Java (OpenJDK) ──────────────────────────────────────────────────────
echo [3/10] Checking Java...
java -version >nul 2>&1
if %errorLevel% == 0 (
    echo Java is already installed.
) else (
    echo Installing OpenJDK 17...
    winget install -e --id Oracle.JDK.17
)

:: ── 4. C & C++ (MinGW-w64) ──────────────────────────────────────────────────
echo [4/10] Checking C/C++ (gcc)...
gcc --version >nul 2>&1
if %errorLevel% == 0 (
    echo GCC is already installed.
) else (
    echo Installing MinGW-w64 (GCC/G++)...
    winget install -e --id msys2.msys2
    echo [NOTE] MSYS2 installed. To get GCC, you usually need to run 'pacman -S mingw-w64-x86_64-gcc' in MSYS2 terminal.
)

:: ── 5. Go Lang ─────────────────────────────────────────────────────────────
echo [5/10] Checking Go...
go version >nul 2>&1
if %errorLevel% == 0 (
    echo Go is already installed.
) else (
    echo Installing Go Lang...
    winget install -e --id GoLang.Go
)

:: ── 6. R Programming ───────────────────────────────────────────────────────
echo [6/10] Checking R...
R --version >nul 2>&1
if %errorLevel% == 0 (
    echo R is already installed.
) else (
    echo Installing R...
    winget install -e --id RProject.R
)

:: ── 7. MongoDB ─────────────────────────────────────────────────────────────
echo [7/10] Checking MongoDB...
mongod --version >nul 2>&1
if %errorLevel% == 0 (
    echo MongoDB is already installed.
) else (
    echo Installing MongoDB Community Server...
    winget install -e --id MongoDB.Server
)

:: ── 8. PostgreSQL ──────────────────────────────────────────────────────────
echo [8/10] Checking PostgreSQL...
psql --version >nul 2>&1
if %errorLevel% == 0 (
    echo PostgreSQL is already installed.
) else (
    echo Installing PostgreSQL 15...
    winget install -e --id PostgreSQL.PostgreSQL.15
)

:: ── 9. HBase ───────────────────────────────────────────────────────────────
echo [9/10] HBase Setup Note...
echo [INFO] HBase requires a complex Hadoop/Java setup.
echo [INFO] Downloading HBase binaries to C:\hbase if not present...
if not exist "C:\hbase" (
    echo [INFO] Please manualy install HBase or use a Docker container for complex labs.
    echo [INFO] Winget does not have a reliable direct HBase installer.
)

:: ── 10. System Finalization ───────────────────────────────────────────────
echo [10/10] Refreshing Environment Variables...
:: This helper refreshes the path in the current shell
setx /M PATH "%PATH%"

echo.
echo ============================================================
echo   INSTALLATION COMPLETE!
echo   --------------------------------------------------------
echo   Installed: Node.js, Python(matplotlib), Java, Go, R, 
echo              MongoDB, PostgreSQL.
echo.
echo   [IMPORTANT] You MUST RESTART your computer or at least
echo   RESTART all terminals to use the new compilers.
echo ============================================================
pause
