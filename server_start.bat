@echo off
setlocal EnableDelayedExpansion

echo ==================================================
echo   CodeGurukul Server Startup Sequence
echo ==================================================

echo 1. Starting PostgreSQL service...
net start "postgresql-x64-15" 2>nul
if %errorlevel% neq 0 (
    echo    PostgreSQL named 'postgresql-x64-15' service start failed or already running. Skipping error...
    REM Try just standard named service
    net start postgresql 2>nul
)

echo 2. Starting MongoDB service...
net start MongoDB 2>nul
if %errorlevel% neq 0 (
    echo    MongoDB service start failed or already running. Skipping error...
)

echo 3. Starting ngrok tunnel (HTTP 5000)...
start /b cmd /c "ngrok http 5000 --log=stdout > nul"
timeout /t 3 > nul

echo 4. Fetching public ngrok URL...
powershell -Command "$response = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels'; $url = $response.tunnels[0].public_url; if (-Not (Test-Path 'backend\config')) { New-Item -ItemType Directory -Force -Path 'backend\config' }; $json = \"{\`\"apiUrl\`\":\`\"$url\`\"}\"; Set-Content -Path 'backend\config\tunnel_url.json' -Value $json"

echo.
set /p API_URL=<"backend\config\tunnel_url.json"
echo NGROK PUBLIC URL IS SET AS: %API_URL%
echo.

echo 5. Killing any existing process on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do (
    echo    Killing PID %%a on port 5000...
    taskkill /F /PID %%a 2>nul
)
timeout /t 1 >nul

echo 6. Starting Backend Server...
cd backend
npm start

echo ==================================================
pause
