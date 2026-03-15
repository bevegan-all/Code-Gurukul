@echo off
setlocal EnableDelayedExpansion
title Exporting Portable CodeGurukul App...
color 0B

echo ============================================================
echo   CodeGurukul - Portable App Exporter
echo   Building and packaging for student computers...
echo ============================================================
echo.

:: ── 1. Build the Windows App ──────────────────────────────────────────────
echo [1/4] Building Electron application...
cd /d "%~dp0windows-app"

:: Clear old builds
if exist "release" rmdir /s /q "release"

echo      Running npm install...
call npm install --silent
echo      Running npm run build...
call npm run build

if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Check windows-app console for errors.
    pause
    exit /b 1
)

:: ── 2. Prepare Export Folder ───────────────────────────────────────────────
echo.
echo [2/4] Preparing portable folder on Desktop...
set DesktopFolder=%USERPROFILE%\Desktop\CodeGurukul_Student_Portable
if exist "%DesktopFolder%" rmdir /s /q "%DesktopFolder%"
mkdir "%DesktopFolder%"

:: Copy the unpacked electron app
echo      Copying app binaries...
xcopy /E /I /Y "release\win-unpacked" "%DesktopFolder%\app" >nul

:: ── 3. Add Utility Scripts ────────────────────────────────────────────────
echo [3/4] Adding launch and install scripts...

:: Create the main launch.bat in the root
(
echo @echo off
echo title CodeGurukul Secure Lab
echo echo Starting CodeGurukul...
echo start "" "%%~dp0app\CodeGurukul Secure Lab.exe"
echo exit
) > "%DesktopFolder%\Launch_App.bat"

:: Copy the comprehensive compiler installer
copy /Y "%~dp0install_compiler_interpreters.bat" "%DesktopFolder%\Install_Compilers_And_DBs.bat" >nul

:: Create a small README
(
echo ============================================================
echo           CodeGurukul Student Portable App
echo ============================================================
echo.
echo 1. Launch_App.bat          - Opens the secure exam app.
echo 2. Install_Compilers.bat - Run this ONCE as admin to set 
echo                              up Python, Java, C++, etc.
echo.
echo NOTE: Make sure your teacher has started the local server
echo       and you have a stable network connection.
) > "%DesktopFolder%\README_FIRST.txt"

:: ── 4. Finalize ────────────────────────────────────────────────────────────
echo.
echo [4/4] Wrapping up...
echo      Cleaning up temporary build files...
:: rmdir /s /q "release"

echo.
echo ============================================================
echo   ✅ SUCCESS! Portable App is ready on your Desktop.
echo   Folder: CodeGurukul_Student_Portable
echo ============================================================
echo.
echo You can now copy the folder 'CodeGurukul_Student_Portable' 
echo to any USB drive and share it with students.
echo they just need to run 'Launch_App.bat'.
echo.
pause
