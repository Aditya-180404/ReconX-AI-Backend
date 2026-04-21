import subprocess
import shutil
from .nmap_wrapper import _sanitise_target

def run_sqlmap(target: str) -> str:
    if not shutil.which('sqlmap'):
        return '[SQLMAP] sqlmap not found in PATH'
    
    host = _sanitise_target(target)
    # Basic non-intrusive scan for demo
    cmd = ['sqlmap', '-u', host, '--batch', '--random-agent', '--level=1', '--risk=1', '--threads=1', '--forms', '--crawl=2', '--tamper=space2comment']
    
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=300,
            text=True,
        )
        return result.stdout or '[SQLMAP] No output'
    except subprocess.TimeoutExpired:
        return '[SQLMAP] Scan timed out after 300s'
    except Exception as e:
        return f'[SQLMAP] Error: {e}'
