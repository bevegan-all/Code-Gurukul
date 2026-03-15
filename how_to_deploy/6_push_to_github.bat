@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   CodeGurukul - Step 6: Push to GitHub
echo ============================================================
echo.

cd /d "%~dp0.."

:: Check if git is initialized
if not exist ".git" (
    echo [ERROR] .git folder not found. Initialize git first:
    echo   git init
    echo   git remote add origin https://github.com/YOUR_USERNAME/code-gurukul.git
    echo   git branch -M main
    pause
    exit /b 1
)

:: Check remote
git remote -v 2>nul | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo [WARN] No git remote "origin" configured.
    set /p REMOTE_URL=Enter your GitHub repository URL: 
    git remote add origin "!REMOTE_URL!"
    git branch -M main
)

:: Get commit message
set TIMESTAMP=%date% %time%
set /p COMMIT_MSG=Enter commit message [default: "Update - !TIMESTAMP!"]: 
if "!COMMIT_MSG!"=="" set COMMIT_MSG=Update - !TIMESTAMP!

echo.
echo [1/3] Staging all changes...
git add -A
echo      [OK] All files staged.

echo [2/3] Committing: "!COMMIT_MSG!" ...
git commit -m "!COMMIT_MSG!"
if %errorlevel% neq 0 (
    echo      [!] Nothing to commit or commit failed.
)

echo [3/3] Pushing to origin/main ...
git push origin main
if %errorlevel% equ 0 (
    echo      [OK] Successfully pushed to GitHub!
) else (
    echo      [ERROR] Push failed. You may need to:
    echo        1. Set up GitHub credentials: gh auth login
    echo        2. Or use SSH key instead of HTTPS
    echo        3. Run: git push --set-upstream origin main  (first time)
)

echo.
echo ============================================================
echo   GitHub push complete!
echo   Next: Deploy frontend on Vercel (see DEPLOYMENT_GUIDE.txt)
echo ============================================================
pause
