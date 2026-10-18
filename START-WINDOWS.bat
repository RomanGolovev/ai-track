@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 LTS from https://nodejs.org/ then run this file again.
 start https://nodejs.org/
 pause
 exit /b 1
)
if not exist node_modules (
 echo Installing Life OS dependencies. Please wait...
 call npm.cmd ci
 if errorlevel 1 (
  echo Installation failed. Send a screenshot of this window.
  pause
  exit /b 1
 )
)
echo Starting Life OS. Keep this window open.
echo Once Ready appears, open http://localhost:3000 in your browser.
call npm.cmd run dev
pause
