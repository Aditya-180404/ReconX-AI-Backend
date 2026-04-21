"""
subfinder_wrapper.py — Secure Subfinder subprocess wrapper
"""
import subprocess
import shutil
import re
import urllib.parse

def _extract_domain(target: str) -> str:
    if '://' not in target:
        target = f'https://{target}'
    host = urllib.parse.urlparse(target).hostname or target
    if not re.fullmatch(r'[a-zA-Z0-9.\-]+', host):
        raise ValueError(f'Invalid domain: {host!r}')
    return host

def run_subfinder(target: str) -> str:
    """
    Enumerate subdomains of `target` using subfinder.
    Returns newline-separated list of discovered subdomains.
    """
    if not shutil.which('subfinder'):
        return '[SUBFINDER] subfinder not found — install: go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest'

    domain = _extract_domain(target)
    cmd    = ['subfinder', '-d', domain, '-silent', '-all']

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=120,
            text=True,
        )
        return result.stdout or '[SUBFINDER] No subdomains found'
    except subprocess.TimeoutExpired:
        return '[SUBFINDER] Timed out after 120s'
    except Exception as e:
        return f'[SUBFINDER] Error: {e}'
