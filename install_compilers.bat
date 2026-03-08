@echo off
echo =======================================================
echo     CodeGurukul Native Compiler Setup Utility
echo =======================================================
echo This script uses Windows Package Manager (winget) to
echo install the required native compilers for the CodeGurukul
echo exam and local sandboxed grading environment.
echo.
echo REQUIRED COMPILERS:
echo  - Python 3
echo  - Node.js LTS (JavaScript)
echo  - Java JDK
echo  - GCC (C/C++) via MSYS2
echo.
echo NOTE: Please ensure you are running this as Administrator!
echo.
pause

echo.
echo [1/4] Installing Python...
winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements

echo.
echo [2/4] Installing Node.js (LTS)...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

echo.
echo [3/4] Installing Java JDK...
winget install -e --id Oracle.JDK.21 --accept-package-agreements --accept-source-agreements

echo.
echo [4/4] Installing GCC (C/C++) Toolchain...
winget install -e --id MSYS2.MSYS2 --accept-package-agreements --accept-source-agreements
echo !!! IMPORTANT for C/C++ !!!
echo You must open MSYS2 after installation and run:
echo   pacman -S mingw-w64-x86_64-gcc
echo And add "C:\msys64\mingw64\bin" to your System environment PATH.

echo.
echo =======================================================
echo Installation Process Finished!
echo Please restart your computer or IDE to ensure all System
echo PATH Variables are updated correctly before running
echo the backend compiler server.
echo =======================================================
pause
