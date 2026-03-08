@echo off
echo Stopping any existing Node.js backend on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do (
    echo Killing PID %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 1 >nul
echo Starting fresh backend server...
cd /d "%~dp0backend"
npm start
