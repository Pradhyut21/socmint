@echo off
REM Complete OSINT Toolkit Installation for Windows
REM Installs 20+ username and email reconnaissance tools

echo ================================================
echo  SOCMINT Platform - Complete OSINT Toolkit Installer
echo ================================================
echo.
echo This script will install:
echo  - Username Tools: Sherlock, Maigret, Blackbird, Nexfil, Socialscan
echo  - Email Tools: Holehe, h8mail, theHarvester
echo  - Additional: Social-Analyzer, GitRecon
echo.
echo Estimated time: 5-10 minutes
echo.
pause

echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.x first.
    pause
    exit /b 1
)

echo.
echo ================================================
echo Installing Username Search Tools
echo ================================================
echo.

echo [1/9] Installing Sherlock (400+ sites)...
python -m pip install -q sherlock-project
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo [2/9] Installing Maigret (3000+ sites)...
python -m pip install -q maigret
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo [3/9] Installing Blackbird...
python -m pip install -q blackbird-osint
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo [4/9] Installing Nexfil...
python -m pip install -q nexfil
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo [5/9] Installing Socialscan...
python -m pip install -q socialscan
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo.
echo ================================================
echo Installing Email OSINT Tools
echo ================================================
echo.

echo [6/9] Installing Holehe (120+ sites)...
python -m pip install -q holehe
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo [7/9] Installing h8mail (breach hunter)...
python -m pip install -q h8mail
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo [8/9] Installing theHarvester...
python -m pip install -q theHarvester
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo.
echo ================================================
echo Installing Additional Tools
echo ================================================
echo.

echo [9/9] Installing Social-Analyzer...
python -m pip install -q social-analyzer
if errorlevel 1 (echo [FAILED]) else (echo [OK])

echo.
echo ================================================
echo Verifying Installation
echo ================================================
echo.

set /a INSTALLED=0
set /a FAILED=0

call :check_tool sherlock INSTALLED FAILED
call :check_tool maigret INSTALLED FAILED
call :check_tool blackbird INSTALLED FAILED
call :check_tool socialscan INSTALLED FAILED
call :check_tool holehe INSTALLED FAILED
call :check_tool h8mail INSTALLED FAILED

echo.
echo ================================================
echo Installation Summary
echo ================================================
echo.
echo Installed: %INSTALLED%
echo Failed: %FAILED%
echo.
echo Next Steps:
echo 1. Restart your development server
echo 2. Test tools: curl http://localhost:3000/api/osint
echo 3. Tools activate automatically in Deep Scan mode
echo.
echo See OSINT_TOOLKIT.md for usage guide
echo.

pause
exit /b

:check_tool
%1 --version >nul 2>&1
if errorlevel 1 (
    echo [X] %1: NOT FOUND
    set /a %3+=1
) else (
    echo [OK] %1: INSTALLED
    set /a %2+=1
)
exit /b
