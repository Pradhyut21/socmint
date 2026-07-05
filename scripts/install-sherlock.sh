#!/bin/bash
# Sherlock and Maigret Installation Script for Linux/Mac
# Run this script to install OSINT username search tools

set -e

echo "================================================"
echo " SOCMINT Platform - Sherlock/Maigret Installer"
echo "================================================"
echo ""

# Check Python
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed"
    echo "Please install Python 3.x:"
    echo "  - Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "  - macOS: brew install python3"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "Python found: $PYTHON_VERSION"
echo ""

# Check pip
echo "Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo "[ERROR] pip3 is not installed"
    echo "Please install pip3:"
    echo "  - Ubuntu/Debian: sudo apt install python3-pip"
    echo "  - macOS: python3 -m ensurepip"
    exit 1
fi

echo "pip3 found!"
echo ""

# Install Sherlock
echo "================================================"
echo "Installing Sherlock (400+ social networks)"
echo "================================================"
if pip3 install sherlock-project; then
    echo "[SUCCESS] Sherlock installed successfully!"
else
    echo "[WARNING] Sherlock installation failed"
fi
echo ""

# Install Maigret
echo "================================================"
echo "Installing Maigret (3000+ social networks)"
echo "================================================"
if pip3 install maigret; then
    echo "[SUCCESS] Maigret installed successfully!"
else
    echo "[WARNING] Maigret installation failed"
fi
echo ""

# Verify installation
echo "================================================"
echo "Verifying Installation"
echo "================================================"
echo ""

echo "Checking Sherlock..."
if command -v sherlock &> /dev/null; then
    echo "[OK] Sherlock: INSTALLED"
    sherlock --version
else
    echo "[X] Sherlock: NOT FOUND"
fi

echo ""
echo "Checking Maigret..."
if command -v maigret &> /dev/null; then
    echo "[OK] Maigret: INSTALLED"
    maigret --version
else
    echo "[X] Maigret: NOT FOUND"
fi

echo ""
echo "================================================"
echo "Installation Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Restart your development server if running"
echo "2. Check tool status at /api/sherlock"
echo "3. Tools will auto-activate in Deep Scan mode"
echo ""
echo "See SHERLOCK_INTEGRATION.md for usage details"
echo ""
