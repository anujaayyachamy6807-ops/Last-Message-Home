@echo off
rem Double-click this file to combine all project files into ONE web app file:
rem   dist\last-message-home.html
rem It then opens that file in your browser.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install it from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
  pause
  exit /b 1
)
echo Checking the robot facts against the saved NASA pages...
python scripts\check_data.py
if errorlevel 1 (
  echo.
  echo Some facts did not match. Fix the lines shown above in data\contacts.json, then run build.bat again.
  pause
  exit /b 1
)
echo.
echo Combining everything into one file...
python scripts\build_single.py
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Done! Your web app is: %~dp0dist\last-message-home.html
start "" "%~dp0dist\last-message-home.html"
pause
