@echo off
rem Double-click this file to run Last Message Home.
rem It starts a small local web server in this folder and opens the app in your browser.
rem Close this window to stop the app.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install it from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
  pause
  exit /b 1
)
echo Starting Last Message Home at http://localhost:8000
echo Keep this window open. Close it to stop the app.
start "" http://localhost:8000
python -m http.server 8000
