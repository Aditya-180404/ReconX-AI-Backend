"""
nikto_wrapper.py — Secure Nikto subprocess wrapper
"""
import subprocess
import shutil
import re
import urllib.parse

def _validate_url(target: str) -> str:
    if '://' not in target:
        target = f'http://{target}'
    parsed = urllib.parse.urlparse(target)
    host = parsed.hostname or ''
    if not re.fullmatch(r'[a-zA-Z0-9.\-]+', host):
        raise ValueError(f'Invalid target: {host!r}')
    return target

def run_nikto(target: str) -> str:
    """
    Run Nikto web vulnerability scanner against `target`.
    Returns raw stdout text.
    """
    if not shutil.which('nikto'):
        return '[NIKTO] nikto not found in PATH — install: apt install nikto / brew install nikto'

    url = _validate_url(target)
    cmd = ['nikto', '-h', url, '-nointeractive', '-Tuning', '123b', '-Format', 'txt', '-output', '-']

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=300,
            text=True,
        )
        return result.stdout or '[NIKTO] No output'
    except subprocess.TimeoutExpired:
        return '[NIKTO] Scan timed out after 300s'
    except Exception as e:
        return f'[NIKTO] Error: {e}'
