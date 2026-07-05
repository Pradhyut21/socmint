#!/usr/bin/env python3
"""
Unified OSINT Toolkit Integration
Combines 20+ username and email OSINT tools
"""

import json
import sys
import subprocess
import os
import tempfile
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import time

class OSINTToolkit:
    """Unified interface for multiple OSINT tools"""
    
    def __init__(self):
        self.tools_status = self._check_all_tools()
    
    def _check_all_tools(self) -> Dict[str, bool]:
        """Check which OSINT tools are installed"""
        tools = {
            # Username tools
            'sherlock': self._check_command('sherlock'),
            'maigret': self._check_command('maigret'),
            'blackbird': self._check_python_package('blackbird'),
            'nexfil': self._check_command('nexfil'),
            'socialscan': self._check_command('socialscan'),
            'holehe': self._check_command('holehe'),
            'osrframework': self._check_command('usufy.py'),
            
            # Email tools
            'h8mail': self._check_command('h8mail'),
            'theHarvester': self._check_command('theHarvester'),
            'infoga': self._check_python_package('infoga'),
            
            # Additional tools
            'social_analyzer': self._check_python_package('social_analyzer'),
            'gitrecon': self._check_command('gitrecon'),
        }
        return tools
    
    def _check_command(self, cmd: str) -> bool:
        """Check if a command exists"""
        try:
            subprocess.run([cmd, '--version'], capture_output=True, timeout=3)
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            try:
                subprocess.run([cmd, '-h'], capture_output=True, timeout=3)
                return True
            except:
                return False
    
    def _check_python_package(self, package: str) -> bool:
        """Check if a Python package is installed"""
        try:
            __import__(package)
            return True
        except ImportError:
            return False
    
    def search_username(self, username: str, timeout: int = 45) -> Dict[str, Any]:
        """Search username across all available tools"""
        results = {
            'username': username,
            'tools_used': [],
            'accounts_found': 0,
            'accounts': [],
            'errors': []
        }
        
        # Run tools in parallel
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            
            if self.tools_status.get('sherlock'):
                futures.append(executor.submit(self._run_sherlock, username, timeout))
            
            if self.tools_status.get('maigret'):
                futures.append(executor.submit(self._run_maigret, username, timeout))
            
            if self.tools_status.get('blackbird'):
                futures.append(executor.submit(self._run_blackbird, username, timeout))
            
            if self.tools_status.get('socialscan'):
                futures.append(executor.submit(self._run_socialscan, username, timeout))
            
            # Collect results
            for future in futures:
                try:
                    tool_result = future.result(timeout=timeout + 5)
                    if tool_result['success']:
                        results['tools_used'].append(tool_result['tool'])
                        results['accounts'].extend(tool_result['accounts'])
                    else:
                        results['errors'].append(tool_result.get('error', 'Unknown error'))
                except Exception as e:
                    results['errors'].append(str(e))
        
        # Deduplicate accounts by platform
        seen = {}
        unique_accounts = []
        for acc in results['accounts']:
            key = f"{acc['platform']}:{acc['username']}"
            if key not in seen:
                seen[key] = True
                unique_accounts.append(acc)
        
        results['accounts'] = unique_accounts
        results['accounts_found'] = len(unique_accounts)
        
        return results
    
    def search_email(self, email: str, timeout: int = 45) -> Dict[str, Any]:
        """Search email across all available tools"""
        results = {
            'email': email,
            'tools_used': [],
            'registrations_found': 0,
            'sites': [],
            'breaches': [],
            'errors': []
        }
        
        # Run email-specific tools
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            
            if self.tools_status.get('holehe'):
                futures.append(executor.submit(self._run_holehe, email, timeout))
            
            if self.tools_status.get('h8mail'):
                futures.append(executor.submit(self._run_h8mail, email, timeout))
            
            if self.tools_status.get('socialscan'):
                futures.append(executor.submit(self._run_socialscan_email, email, timeout))
            
            # Collect results
            for future in futures:
                try:
                    tool_result = future.result(timeout=timeout + 5)
                    if tool_result['success']:
                        results['tools_used'].append(tool_result['tool'])
                        if 'sites' in tool_result:
                            results['sites'].extend(tool_result['sites'])
                        if 'breaches' in tool_result:
                            results['breaches'].extend(tool_result['breaches'])
                    else:
                        results['errors'].append(tool_result.get('error', 'Unknown error'))
                except Exception as e:
                    results['errors'].append(str(e))
        
        # Deduplicate sites
        results['sites'] = list(set(results['sites']))
        results['registrations_found'] = len(results['sites'])
        
        return results
    
    def _run_sherlock(self, username: str, timeout: int) -> Dict[str, Any]:
        """Run Sherlock"""
        try:
            result = subprocess.run(
                ['sherlock', username, '--json', '--timeout', str(timeout), '--print-found'],
                capture_output=True,
                text=True,
                timeout=timeout + 10
            )
            
            accounts = []
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        try:
                            data = json.loads(line)
                            for platform, info in data.items():
                                if isinstance(info, dict) and info.get('url_user'):
                                    accounts.append({
                                        'platform': platform.lower(),
                                        'username': username,
                                        'url': info['url_user'],
                                        'tool': 'sherlock'
                                    })
                        except:
                            continue
            
            return {'success': True, 'tool': 'sherlock', 'accounts': accounts}
        except Exception as e:
            return {'success': False, 'tool': 'sherlock', 'error': str(e)}
    
    def _run_maigret(self, username: str, timeout: int) -> Dict[str, Any]:
        """Run Maigret"""
        try:
            output_file = tempfile.mktemp(suffix='.json')
            
            result = subprocess.run(
                ['maigret', username, '--json', 'simple', '--timeout', str(timeout), 
                 '--no-progressbar', '-o', output_file],
                capture_output=True,
                timeout=timeout + 20
            )
            
            accounts = []
            if os.path.exists(output_file):
                with open(output_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for platform, info in data.items():
                        if isinstance(info, dict) and info.get('status') == 'found':
                            accounts.append({
                                'platform': platform.lower(),
                                'username': username,
                                'url': info.get('url', ''),
                                'tool': 'maigret',
                                'tags': info.get('tags', [])
                            })
                try:
                    os.remove(output_file)
                except:
                    pass
            
            return {'success': True, 'tool': 'maigret', 'accounts': accounts}
        except Exception as e:
            return {'success': False, 'tool': 'maigret', 'error': str(e)}
    
    def _run_blackbird(self, username: str, timeout: int) -> Dict[str, Any]:
        """Run Blackbird"""
        try:
            result = subprocess.run(
                ['blackbird', '--username', username, '--json'],
                capture_output=True,
                text=True,
                timeout=timeout + 10
            )
            
            accounts = []
            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    for item in data.get('results', []):
                        if item.get('found'):
                            accounts.append({
                                'platform': item.get('site', '').lower(),
                                'username': username,
                                'url': item.get('url', ''),
                                'tool': 'blackbird'
                            })
                except:
                    pass
            
            return {'success': True, 'tool': 'blackbird', 'accounts': accounts}
        except Exception as e:
            return {'success': False, 'tool': 'blackbird', 'error': str(e)}
    
    def _run_socialscan(self, username: str, timeout: int) -> Dict[str, Any]:
        """Run socialscan for username"""
        try:
            result = subprocess.run(
                ['socialscan', username, '--json'],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            accounts = []
            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    for platform, status in data.items():
                        if status.get('available') == False:  # Account exists
                            accounts.append({
                                'platform': platform.lower(),
                                'username': username,
                                'url': f"https://{platform}.com/{username}",
                                'tool': 'socialscan'
                            })
                except:
                    pass
            
            return {'success': True, 'tool': 'socialscan', 'accounts': accounts}
        except Exception as e:
            return {'success': False, 'tool': 'socialscan', 'error': str(e)}
    
    def _run_holehe(self, email: str, timeout: int) -> Dict[str, Any]:
        """Run holehe for email"""
        try:
            result = subprocess.run(
                ['holehe', email, '--only-used'],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            sites = []
            if result.stdout:
                # Parse holehe output
                for line in result.stdout.split('\n'):
                    if '[+]' in line:
                        # Extract site name from line
                        parts = line.split('[+]')[1].strip().split()
                        if parts:
                            sites.append(parts[0])
            
            return {'success': True, 'tool': 'holehe', 'sites': sites}
        except Exception as e:
            return {'success': False, 'tool': 'holehe', 'error': str(e)}
    
    def _run_h8mail(self, email: str, timeout: int) -> Dict[str, Any]:
        """Run h8mail for email"""
        try:
            result = subprocess.run(
                ['h8mail', '-t', email, '--json', 'h8mail_output.json'],
                capture_output=True,
                timeout=timeout
            )
            
            breaches = []
            if os.path.exists('h8mail_output.json'):
                with open('h8mail_output.json', 'r') as f:
                    data = json.load(f)
                    for target in data.get('targets', []):
                        breaches.extend(target.get('pwned', []))
                try:
                    os.remove('h8mail_output.json')
                except:
                    pass
            
            return {'success': True, 'tool': 'h8mail', 'breaches': breaches}
        except Exception as e:
            return {'success': False, 'tool': 'h8mail', 'error': str(e)}
    
    def _run_socialscan_email(self, email: str, timeout: int) -> Dict[str, Any]:
        """Run socialscan for email"""
        try:
            result = subprocess.run(
                ['socialscan', email, '--json'],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            sites = []
            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    for platform, status in data.items():
                        if status.get('available') == False:  # Email is registered
                            sites.append(platform)
                except:
                    pass
            
            return {'success': True, 'tool': 'socialscan', 'sites': sites}
        except Exception as e:
            return {'success': False, 'tool': 'socialscan', 'error': str(e)}

def install_tools(tools: List[str] = None) -> Dict[str, Any]:
    """Install specified OSINT tools"""
    if tools is None:
        tools = ['all']
    
    results = {}
    
    if 'all' in tools or 'sherlock' in tools:
        results['sherlock'] = _install_pip('sherlock-project')
    
    if 'all' in tools or 'maigret' in tools:
        results['maigret'] = _install_pip('maigret')
    
    if 'all' in tools or 'blackbird' in tools:
        results['blackbird'] = _install_pip('blackbird-osint')
    
    if 'all' in tools or 'nexfil' in tools:
        results['nexfil'] = _install_pip('nexfil')
    
    if 'all' in tools or 'socialscan' in tools:
        results['socialscan'] = _install_pip('socialscan')
    
    if 'all' in tools or 'holehe' in tools:
        results['holehe'] = _install_pip('holehe')
    
    if 'all' in tools or 'h8mail' in tools:
        results['h8mail'] = _install_pip('h8mail')
    
    if 'all' in tools or 'social-analyzer' in tools:
        results['social-analyzer'] = _install_pip('social-analyzer')
    
    if 'all' in tools or 'gitrecon' in tools:
        results['gitrecon'] = _install_pip('gitrecon')
    
    return results

def _install_pip(package: str) -> Dict[str, Any]:
    """Install a pip package"""
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', package],
            capture_output=True,
            text=True,
            timeout=180
        )
        return {
            'installed': result.returncode == 0,
            'error': None if result.returncode == 0 else result.stderr
        }
    except Exception as e:
        return {'installed': False, 'error': str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: osintToolkit.py <command> [args]",
            "commands": {
                "check-tools": "Check which tools are installed",
                "search-username <username>": "Search username across all tools",
                "search-email <email>": "Search email across all tools",
                "install [tool1,tool2,...]": "Install specified tools (or 'all')"
            }
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "check-tools":
        toolkit = OSINTToolkit()
        print(json.dumps({
            'success': True,
            'tools': toolkit.tools_status
        }, indent=2))
    
    elif command == "search-username" and len(sys.argv) > 2:
        username = sys.argv[2]
        timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 45
        toolkit = OSINTToolkit()
        result = toolkit.search_username(username, timeout)
        print(json.dumps(result, indent=2))
    
    elif command == "search-email" and len(sys.argv) > 2:
        email = sys.argv[2]
        timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 45
        toolkit = OSINTToolkit()
        result = toolkit.search_email(email, timeout)
        print(json.dumps(result, indent=2))
    
    elif command == "install":
        tools_to_install = sys.argv[2].split(',') if len(sys.argv) > 2 else ['all']
        result = install_tools(tools_to_install)
        print(json.dumps(result, indent=2))
    
    else:
        print(json.dumps({'error': 'Invalid command'}))
        sys.exit(1)
