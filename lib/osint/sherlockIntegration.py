#!/usr/bin/env python3
"""
Sherlock/Maigret Integration for SOCMINT
Searches username across 400-3000+ social networks
"""

import json
import sys
import subprocess
import os
from typing import Dict, List, Any

def check_tools_installed() -> Dict[str, bool]:
    """Check if Sherlock and Maigret are installed"""
    sherlock_installed = False
    maigret_installed = False
    
    try:
        subprocess.run(["sherlock", "--version"], capture_output=True, timeout=5)
        sherlock_installed = True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    try:
        subprocess.run(["maigret", "--version"], capture_output=True, timeout=5)
        maigret_installed = True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    return {
        "sherlock": sherlock_installed,
        "maigret": maigret_installed
    }

def run_sherlock(username: str, timeout: int = 30) -> List[Dict[str, Any]]:
    """
    Run Sherlock to find username across 400+ social networks
    Returns list of found accounts
    """
    results = []
    
    try:
        # Run Sherlock with JSON output
        cmd = [
            "sherlock",
            username,
            "--json",
            "--timeout", str(timeout),
            "--print-found"
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout + 10
        )
        
        if result.returncode == 0 and result.stdout:
            try:
                # Sherlock outputs one JSON object per line
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        data = json.loads(line)
                        # Extract found accounts
                        for platform, info in data.items():
                            if isinstance(info, dict) and info.get("url_user"):
                                results.append({
                                    "platform": platform.lower(),
                                    "username": username,
                                    "url": info["url_user"],
                                    "status": "found",
                                    "tool": "sherlock"
                                })
            except json.JSONDecodeError:
                # Fallback: parse text output
                pass
        
    except subprocess.TimeoutExpired:
        print(f"Sherlock timeout for {username}", file=sys.stderr)
    except Exception as e:
        print(f"Sherlock error: {e}", file=sys.stderr)
    
    return results

def run_maigret(username: str, timeout: int = 60) -> List[Dict[str, Any]]:
    """
    Run Maigret to find username across 3000+ social networks
    Returns list of found accounts
    """
    results = []
    
    try:
        # Create temp directory for Maigret output
        output_file = f"maigret_{username}.json"
        
        cmd = [
            "maigret",
            username,
            "--json", "simple",
            "--timeout", str(timeout),
            "--no-progressbar",
            "-o", output_file
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout + 20
        )
        
        # Read JSON output file
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Parse Maigret results
                if isinstance(data, dict):
                    for platform, info in data.items():
                        if isinstance(info, dict) and info.get("status") == "found":
                            results.append({
                                "platform": platform.lower(),
                                "username": username,
                                "url": info.get("url", ""),
                                "status": "found",
                                "tool": "maigret",
                                "metadata": {
                                    "tags": info.get("tags", []),
                                    "type": info.get("type", "")
                                }
                            })
            
            # Cleanup
            try:
                os.remove(output_file)
            except:
                pass
        
    except subprocess.TimeoutExpired:
        print(f"Maigret timeout for {username}", file=sys.stderr)
    except Exception as e:
        print(f"Maigret error: {e}", file=sys.stderr)
    
    return results

def search_username_osint(username: str, mode: str = "quick") -> Dict[str, Any]:
    """
    Search username using available OSINT tools
    
    Args:
        username: Username to search
        mode: "quick" (Sherlock only, 30s) or "deep" (Maigret, 60s)
    
    Returns:
        Dictionary with results and tool status
    """
    tools_status = check_tools_installed()
    accounts = []
    
    if mode == "quick" and tools_status["sherlock"]:
        accounts.extend(run_sherlock(username, timeout=30))
    elif mode == "deep":
        if tools_status["maigret"]:
            accounts.extend(run_maigret(username, timeout=60))
        elif tools_status["sherlock"]:
            # Fallback to Sherlock if Maigret not available
            accounts.extend(run_sherlock(username, timeout=45))
    
    # Deduplicate by platform
    seen = set()
    unique_accounts = []
    for acc in accounts:
        key = acc["platform"]
        if key not in seen:
            seen.add(key)
            unique_accounts.append(acc)
    
    return {
        "username": username,
        "mode": mode,
        "tools_available": tools_status,
        "accounts_found": len(unique_accounts),
        "accounts": unique_accounts,
        "platforms": list(seen)
    }

def install_tools() -> Dict[str, Any]:
    """Attempt to install Sherlock and Maigret"""
    results = {
        "sherlock": {"installed": False, "error": None},
        "maigret": {"installed": False, "error": None}
    }
    
    # Try installing Sherlock
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "sherlock-project"],
            capture_output=True,
            timeout=120
        )
        results["sherlock"]["installed"] = True
    except Exception as e:
        results["sherlock"]["error"] = str(e)
    
    # Try installing Maigret
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "maigret"],
            capture_output=True,
            timeout=120
        )
        results["maigret"]["installed"] = True
    except Exception as e:
        results["maigret"]["error"] = str(e)
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: sherlockIntegration.py <username> [mode] | --check-tools | --install"}))
        sys.exit(1)
    
    arg = sys.argv[1]
    
    # Check tools flag
    if arg == "--check-tools":
        tools = check_tools_installed()
        result = {"tools_available": tools}
        print(json.dumps(result, indent=2))
        sys.exit(0)
    
    # Install flag
    if arg == "--install":
        result = install_tools()
        print(json.dumps(result, indent=2))
        sys.exit(0)
    
    # Regular search
    username = arg
    mode = sys.argv[2] if len(sys.argv) > 2 else "quick"
    
    result = search_username_osint(username, mode)
    print(json.dumps(result, indent=2))
