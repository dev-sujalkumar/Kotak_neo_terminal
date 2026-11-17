@echo off
setlocal
title Kotak Neo Terminal - Project Launcher

:: ============================================================
::  KOTAK NEO STOCK TERMINAL - ONE-CLICK LAUNCHER
::  Starts: ML/NLP Service (port 8000) + Backend API (port 5000)
::          + Frontend Vite Dev Server (port 3000)
:: ============================================================

set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "ML_DIR=%PROJECT_DIR%ml-service"

cls
echo.
echo  ============================================================
echo   KOTAK NEO STOCK TERMINAL - ONE-CLICK LAUNCHER
echo  ============================================================
echo.
echo  Project Directory : %PROJECT_DIR%
echo.
echo  Services to start:
echo    [1] Python ML/NLP Service   --^>  http://localhost:8000
echo    [2] Node.js Backend API     --^>  http://localhost:5000
echo    [3] React Frontend (Vite)   --^>  http://localhost:3000
echo.
echo  ============================================================
echo.

:: -------------------------------------------------------
:: CHECK PREREQUISITES
:: -------------------------------------------------------
echo [CHECK] Verifying prerequisites...
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found! Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js  %NODE_VER%

:: Check npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm not found! Please reinstall Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo  [OK] npm      v%NPM_VER%

:: Check Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Python not found! Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do set PY_VER=%%v
echo  [OK] %PY_VER%
echo.

:: -------------------------------------------------------
:: KILL EXISTING PROCESSES ON THE REQUIRED PORTS
:: -------------------------------------------------------
echo [CLEANUP] Releasing ports 3000, 5000, 8000 if occupied...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,5000,8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
ping 127.0.0.1 -n 2 >nul 2>&1
echo  [OK] Ports cleared.
echo.

:: -------------------------------------------------------
:: INSTALL / VERIFY BACKEND DEPENDENCIES
:: -------------------------------------------------------
echo [SETUP] Checking backend dependencies...
if not exist "%BACKEND_DIR%\node_modules" (
    echo  Installing backend npm packages...
    cd /d "%BACKEND_DIR%"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Backend npm install failed!
        pause
        exit /b 1
    )
    echo  [OK] Backend packages installed.
) else (
    echo  [OK] Backend node_modules already present.
)
echo.

:: -------------------------------------------------------
:: PRISMA DATABASE SETUP
:: -------------------------------------------------------
echo [DATABASE] Setting up Prisma SQLite database...
cd /d "%BACKEND_DIR%"

if not exist "%BACKEND_DIR%\prisma\dev.db" (
    echo  Generating Prisma client...
    call npx prisma generate >nul 2>&1
    echo  Running prisma db push...
    call npx prisma db push --skip-generate >nul 2>&1
    echo  Seeding database...
    call npx tsx prisma/seed.ts >nul 2>&1
    echo  [OK] Database initialized and seeded with default user.
) else (
    echo  [OK] Database already exists: dev.db
)
echo.

:: -------------------------------------------------------
:: INSTALL / VERIFY FRONTEND DEPENDENCIES
:: -------------------------------------------------------
echo [SETUP] Checking frontend dependencies...
if not exist "%FRONTEND_DIR%\node_modules" (
    echo  Installing frontend npm packages...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Frontend npm install failed!
        pause
        exit /b 1
    )
    echo  [OK] Frontend packages installed.
) else (
    echo  [OK] Frontend node_modules already present.
)
echo.

:: -------------------------------------------------------
:: CHECK PYTHON ML DEPENDENCIES
:: -------------------------------------------------------
echo [SETUP] Checking Python ML/NLP dependencies...
python -c "import fastapi, uvicorn, pydantic" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  Installing Python packages from requirements.txt...
    pip install -r "%ML_DIR%\requirements.txt" --quiet
    if %ERRORLEVEL% neq 0 (
        echo  [WARN] Some Python packages may have failed. ML service might start in fallback mode.
    ) else (
        echo  [OK] Python packages installed.
    )
) else (
    echo  [OK] Python packages already installed.
)
echo.

:: -------------------------------------------------------
:: START ML/NLP SERVICE (PORT 8000) IN NEW WINDOW
:: -------------------------------------------------------
echo [START] Launching Python ML/NLP Service on port 8000...
start "Kotak Neo - ML/NLP Service (port 8000)" /D "%ML_DIR%" cmd /k "echo. && echo ============================================= && echo  ML / NLP Service (FinBERT) - PORT 8000 && echo ============================================= && echo. && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
ping 127.0.0.1 -n 3 >nul 2>&1
echo  [OK] ML/NLP service window opened.
echo.

:: -------------------------------------------------------
:: START BACKEND API (PORT 5000) IN NEW WINDOW
:: -------------------------------------------------------
echo [START] Launching Node.js Backend API on port 5000...
start "Kotak Neo - Backend API (port 5000)" /D "%BACKEND_DIR%" cmd /k "echo. && echo ============================================= && echo  Backend API (Express/TypeScript) - PORT 5000 && echo ============================================= && echo. && npm run dev"
ping 127.0.0.1 -n 3 >nul 2>&1
echo  [OK] Backend API window opened.
echo.

:: -------------------------------------------------------
:: START FRONTEND DEV SERVER (PORT 3000) IN NEW WINDOW
:: -------------------------------------------------------
echo [START] Launching React/Vite Frontend on port 3000...
start "Kotak Neo - Frontend UI (port 3000)" /D "%FRONTEND_DIR%" cmd /k "echo. && echo ============================================= && echo  Frontend UI (React/Vite) - PORT 3000 && echo ============================================= && echo. && npm run dev"
ping 127.0.0.1 -n 4 >nul 2>&1
echo  [OK] Frontend server window opened.
echo.

:: -------------------------------------------------------
:: WAIT FOR SERVICES TO BOOT
:: -------------------------------------------------------
echo [WAIT] Waiting for all services to initialize...
ping 127.0.0.1 -n 6 >nul 2>&1
echo.

:: -------------------------------------------------------
:: OPEN BROWSER
:: -------------------------------------------------------
echo [BROWSER] Opening Kotak Neo Terminal in your default browser...
start "" "http://localhost:3000"
echo.

:: -------------------------------------------------------
:: SUMMARY
:: -------------------------------------------------------
echo  ============================================================
echo   ALL SERVICES LAUNCHED SUCCESSFULLY!
echo  ============================================================
echo.
echo   Frontend   :  http://localhost:3000  (React UI)
echo   Backend    :  http://localhost:5000  (Express API)
echo   ML Service :  http://localhost:8000  (FinBERT NLP)
echo   ML Docs    :  http://localhost:8000/docs  (FastAPI Swagger)
echo.
echo   Default Login Credentials:
echo     Email    :  user@kotaktrade.com
echo     Password :  Password123!
echo.
echo   Each service runs in its own terminal window.
echo   Close those windows to stop the services.
echo.
echo   Press any key to close THIS launcher window...
echo  ============================================================
echo.
pause >nul
endlocal
