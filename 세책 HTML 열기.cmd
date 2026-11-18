@echo off
cd /d "%~dp0"
start "Sechaek HTML" cmd /c "START-WINDOWS.cmd"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5174/index.html"
