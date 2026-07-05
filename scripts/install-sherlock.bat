@echo off
REM Sherlock and Maigret Installation Script for Windows
REM Run this script to install OSINT username search tools

echo ================================================
echo  SOCMINT Platform - Sherlock/Maigret Installer
echo ================================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.x from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python found!
echo.

echo Checking pip...
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pip is not available
    echo Please reinstall Python with pip enabled
    pause
    exit /b 1
)

echo pip found!
echo.

echo ================================================
echo Installing Sherlock (400+ social networks)
echo ================================================
python -m pip install sherlock-project
if errorlevel 1 (
    echo [WARNING] Sherlock installation failed
) else (
    echo [SUCCESS] Sherlock installed successfully!
)
echo.

echo ================================================
echo Installing Maigret (3000+ social networks)
echo ================================================
python -m pip install maigret
if errorlevel 1 (
    echo [WARNING] Maigret installation failed
) else (
    echo [SUCCESS] Maigret installed successfully!
)
echo.

echo ================================================
echo Verifying Installation
echo ================================================
echo.

echo Checking Sherlock...
sherlock --version >nul 2>&1
if errorlevel 1 (
    echo [X] Sherlock: NOT FOUND
) else (
    echo [OK] Sherlock: INSTALLED
)

echo Checking Maigret...
maigret --version >nul 2>&1
if errorlevel 1 (
    echo [X] Maigret: NOT FOUND
) else (
    echo [OK] Maigret: INSTALLED
)

echo.
echo ================================================
echo Installation Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Restart your development server if running
echo 2. Check tool status at /api/sherlock
echo 3. Tools will auto-activate in Deep Scan mode
echo.
echo See SHERLOCK_INTEGRATION.md for usage details
echo.

pause
