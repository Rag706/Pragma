@echo off
echo ===== TASKFLOW DIAGNOSTIC =====
echo.

echo [1] Python Launcher (py)...
where py 2>&1
py --version 2>&1
py -3 --version 2>&1

echo.
echo [2] Python in PATH...
where python 2>&1
python --version 2>&1

echo.
echo [3] Python 3.13 at known path...
if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    echo FOUND: %LocalAppData%\Programs\Python\Python313\python.exe
) else (
    echo NOT FOUND at that path
)

echo.
echo [4] npm...
where npm 2>&1
call npm --version 2>&1

echo.
echo [5] node_modules...
if exist "%~dp0frontend\node_modules" (echo FOUND) else (echo NOT FOUND)

echo.
echo [6] Backend folder...
if exist "%~dp0backend\main.py" (echo FOUND) else (echo NOT FOUND)

echo.
echo ===== DONE =====
pause
