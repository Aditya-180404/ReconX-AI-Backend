import subprocess
import shutil
from .nmap_wrapper import _sanitise_target

def run_dos_check(target: str) -> str:
    if not shutil.which('nmap'):
        return '[DOS] nmap not found in PATH'
    
    host = _sanitise_target(target)
    # Safe DoS check scripts (not actual flooding)
    cmd = ['nmap', '--script', 'dos', '-p80,443', host]
    
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=300,
            text=True,
        )
        return result.stdout or '[DOS] No DoS vulnerabilities detected'
    except subprocess.TimeoutExpired:
        return '[DOS] Scan timed out after 300s'
    except Exception as e:
        return f'[DOS] Error: {e}'
