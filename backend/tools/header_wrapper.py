import requests
import ssl
import socket
import datetime
import urllib.parse
from typing import Dict, Any

def run_headers(target: str) -> str:
    """
    Analyzes HTTP security headers and SSL certificate details.
    
    Checks for:
    - HSTS, CSP, X-Frame-Options, etc.
    - SSL Expiry, Issuer, and Serial Number.
    """
    output = []
    
    # 1. Clean Target
    if not target.startswith(('http://', 'https://')):
        url = f'https://{target}'
    else:
        url = target
        
    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname or target
    
    # 2. HTTP Header Analysis
    output.append(f"[*] Analyzing HTTP Headers for: {url}")
    try:
        response = requests.get(url, timeout=10, allow_redirects=True, headers={'User-Agent': 'ReconX-AI/1.0'})
        headers = response.headers
        
        security_headers = [
            'Strict-Transport-Security',
            'Content-Security-Policy',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy',
            'X-XSS-Protection'
        ]
        
        output.append("\n[+] HTTP Security Headers:")
        for sh in security_headers:
            val = headers.get(sh)
            if val:
                output.append(f"  [PASS] {sh}: {val[:60]}...")
            else:
                output.append(f"  [FAIL] {sh} is missing!")
                
        server = headers.get('Server')
        if server:
            output.append(f"\n[!] Information Disclosure: Server header contains '{server}'")
            
    except Exception as e:
        output.append(f"\n[!] Header Analysis Failed: {str(e)}")

    # 3. SSL Certificate Analysis
    output.append(f"\n[*] Analyzing SSL Certificate for: {hostname}")
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # Expiry check
                not_after_str = cert.get('notAfter')
                expiry = datetime.datetime.strptime(not_after_str, '%b %d %H:%M:%S %Y %Z')
                days_left = (expiry - datetime.datetime.utcnow()).days
                
                issuer = dict(x[0] for x in cert.get('issuer'))
                common_name = issuer.get('commonName', 'Unknown')
                
                output.append("[+] SSL Certificate Details:")
                output.append(f"  - Issuer: {common_name}")
                output.append(f"  - Valid Until: {not_after_str}")
                output.append(f"  - Days to Expiry: {days_left} days")
                
                if days_left < 30:
                    output.append("  [!] WARNING: Certificate is near expiry!")
                elif days_left < 0:
                    output.append("  [CRIT] ALERT: Certificate is EXPIRED!")
                    
    except Exception as e:
        output.append(f"  [!] SSL Analysis Failed: {str(e)} (Maybe target is not using HTTPS or port 443 is closed)")

    return "\n".join(output)
