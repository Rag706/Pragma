@echo off
echo ========================================
echo   TaskFlow — First-Time Setup
echo ========================================
echo.

:: Detect Python 3 — try py launcher, then python3, then python in PATH
set PYTHON=
where py >nul 2>&1 && py -3 --version >nul 2>&1 && set PYTHON=py -3
if not defined PYTHON (
    where python3 >nul 2>&1 && set PYTHON=python3
)
if not defined PYTHON (
    where python >nul 2>&1 && python --version 2>&1 | findstr /C:"Python 3" >nul && set PYTHON=python
)
if not defined PYTHON (
    echo ERROR: Python 3 not found in PATH.
    echo.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo During installation, check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo Using: %PYTHON%
%PYTHON% --version
echo.

echo [1/3] Installing Python dependencies...
cd /d "%~dp0backend"
%PYTHON% -m pip install -r requirements.txt
if errorlevel 1 ( echo ERROR: pip install failed. && pause && exit /b 1 )

echo.
echo [2/3] Installing Node.js dependencies...
cd /d "%~dp0frontend"
npm install
if errorlevel 1 ( echo ERROR: npm install failed. && pause && exit /b 1 )

echo.
echo [3/3] Seeding database with sample data...
cd /d "%~dp0backend"
%PYTHON% seed.py

echo.
echo ========================================
echo   Setup complete! Run start.bat to go.
echo ========================================
pause
