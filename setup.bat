@echo off
echo ========================================
echo   TaskFlow — First-Time Setup
echo ========================================
echo.

set PYTHON=%LocalAppData%\Programs\Python\Python313\python.exe

echo [1/3] Installing Python dependencies...
cd /d "%~dp0backend"
"%PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 ( echo ERROR: pip install failed. && pause && exit /b 1 )

echo.
echo [2/3] Installing Node.js dependencies...
cd /d "%~dp0frontend"
npm install
if errorlevel 1 ( echo ERROR: npm install failed. && pause && exit /b 1 )

echo.
echo [3/3] Seeding database with sample data...
cd /d "%~dp0backend"
"%PYTHON%" seed.py

echo.
echo ========================================
echo   Setup complete! Run start.bat to go.
echo ========================================
pause
