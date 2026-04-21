"""
nuclei_wrapper.py — Secure Nuclei subprocess wrapper
"""
import subprocess
import shutil
import re
import urllib.parse

def _validate_url(target: str) -> str:
    if '://' not in target:
        target = f'https://{target}'
    parsed = urllib.parse.urlparse(target)
    host   = parsed.hostname or ''
    if not re.fullmatch(r'[a-zA-Z0-9.\-]+', host):
        raise ValueError(f'Invalid target: {host!r}')
    return target

def run_nuclei(target: str) -> str:
    """
    Run Nuclei against `target` with critical+high+medium severity templates.
    Returns raw stdout.
    """
    if not shutil.which('nuclei'):
        return '[NUCLEI] nuclei not found in PATH — install: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest'

    url = _validate_url(target)
    cmd = [
        'nuclei',
        '-u', url,
        '-severity', 'critical,high,medium',
        '-silent',
        '-rl', '50',
        '-no-color',
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=360,
            text=True,
        )
        return result.stdout or '[NUCLEI] No findings'
    except subprocess.TimeoutExpired:
        return '[NUCLEI] Scan timed out after 360s'
    except Exception as e:
        return f'[NUCLEI] Error: {e}'
