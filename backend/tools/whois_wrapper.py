"""
whois_wrapper.py — Whois lookup via Python whois library (no subprocess needed)
Falls back to subprocess whois if library unavailable.
"""
import shutil
import subprocess
import re
import urllib.parse

def _extract_domain(target: str) -> str:
    if '://' not in target:
        target = f'https://{target}'
    host = urllib.parse.urlparse(target).hostname or target
    if not re.fullmatch(r'[a-zA-Z0-9.\-]+', host):
        raise ValueError(f'Invalid domain: {host!r}')
    return host

def run_whois(target: str) -> str:
    """Return whois registration data for `target`."""
    try:
        domain = _extract_domain(target)
    except ValueError as e:
        return f'[WHOIS] {e}'

    # Prefer python-whois library
    try:
        import whois  # pip install python-whois
        data = whois.whois(domain)
        return str(data)
    except ImportError:
        pass

    # Fallback: system whois command
    if shutil.which('whois'):
        try:
            r = subprocess.run(['whois', domain], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               timeout=30, text=True)
            return r.stdout or '[WHOIS] No output'
        except Exception as e:
            return f'[WHOIS] Error: {e}'

    return '[WHOIS] No whois tool available — install python-whois: pip install python-whois'
