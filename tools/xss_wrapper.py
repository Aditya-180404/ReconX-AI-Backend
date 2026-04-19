import subprocess
import shutil

def run_xss_check(target: str) -> str:
    if not shutil.which('nuclei'):
        return '[XSS] nuclei not found in PATH'
    
    # Using nuclei with xss tags
    cmd = ['nuclei', '-u', target, '-tags', 'xss', '-silent']
    
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=300,
            text=True,
        )
        return result.stdout or '[XSS] No vulnerabilities found'
    except subprocess.TimeoutExpired:
        return '[XSS] Scan timed out after 300s'
    except Exception as e:
        return f'[XSS] Error: {e}'
