"""
nmap_wrapper.py — Secure Nmap subprocess wrapper
"""
import subprocess
import shutil
import re
import urllib.parse

def _sanitise_target(target: str) -> str:
    """Strip URL scheme/path; return hostname or IP only."""
    parsed = urllib.parse.urlparse(target if '://' in target else f'https://{target}')
    host = parsed.hostname or target
    # Allow only safe chars: alphanumeric, dots, hyphens, colons (IPv6)
    if not re.fullmatch(r'[a-zA-Z0-9.\-:]+', host):
        raise ValueError(f"Invalid target hostname: {host!r}")
    return host

def run_nmap(target: str, intensity: str = 'Quick') -> str:
    """
    Run Nmap against `target` and return raw stdout.
    
    Quick  : Top 100 ports, fast timing, no version detection
    Deep   : Top 1000 ports, version detection, standard timing
    """
    if not shutil.which('nmap'):
        return '[NMAP] nmap not found in PATH'

    host = _sanitise_target(target)

    # Note: Using -sS (Syn Scan) requires root/sudo. 
    # For general compatibility with non-root XAMPP/Python setups, we use standard TCP Connect scan if needed,
    # but -T4 -F is usually safe for all.
    
    if intensity == 'Deep':
        # Deep: Version detection, default ports (top 1000)
        cmd = ['nmap', '-T4', '-sV', '--open', '-oN', '-', host]
    else:
        # Quick: Fast mode (top 100 ports), no version detection
        cmd = ['nmap', '-T4', '-F', '--open', '--max-retries', '1', '-oN', '-', host]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=120,
            text=True,
        )
        return result.stdout or '[NMAP] No output'
    except subprocess.TimeoutExpired:
        return '[NMAP] Scan timed out after 120s'
    except Exception as e:
        return f'[NMAP] Error: {e}'
