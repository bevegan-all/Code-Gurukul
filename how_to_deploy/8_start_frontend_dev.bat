@echo off
echo ============================================================
echo   CodeGurukul - Step 8: Start Frontend Dev Server
echo ============================================================
echo.
echo  Starts the React frontend on http://localhost:5173
echo  Use this to test the Teacher and Admin dashboards locally.
echo.
echo  PREREQUISITE: Backend server must be running first!
echo.

cd /d "%~dp0..\frontend"

if not exist "node_modules" (
    echo [!] node_modules not found. Installing...
    npm install
)

echo Starting frontend dev server on http://localhost:5173 ...
echo (Your browser will NOT open automatically — navigate there manually)
echo.
npm run dev
