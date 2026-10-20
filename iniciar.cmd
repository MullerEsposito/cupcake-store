@echo off
cd /d "%~dp0"
call npm run build
if errorlevel 1 exit /b 1
node --env-file-if-exists=.env build/server/main.js
pause
