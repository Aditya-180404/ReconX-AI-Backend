import subprocess
import shutil

def run_zap_scan(target: str) -> str:
    # This is a placeholder since ZAP can be complex to run headless in a quick script
    # For a hackathon, we can mock it or run a very light baseline if zap-cli is present.
    if not shutil.which('zap-cli'):
         return '[ZAP] zap-cli not found. Simulating OWASP ZAP baseline scan...'
    
    cmd = ['zap-cli', 'quick-scan', '--self-contained', '--start-options', '-daemon', target]
    
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=600,
            text=True,
        )
        return result.stdout or '[ZAP] No output'
    except subprocess.TimeoutExpired:
        return '[ZAP] Scan timed out after 600s'
    except Exception as e:
        return f'[ZAP] Error: {e}'
