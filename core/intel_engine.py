import os
import requests
import json

SHODAN_API_KEY = os.getenv('SHODAN_API_KEY', '')
VT_API_KEY     = os.getenv('VT_API_KEY', '')

def get_shodan_intel(target: str) -> str:
    """
    Queries Shodan for public exposure data.
    Takes an IP address or hostname.
    """
    if not SHODAN_API_KEY:
        return "[!] Shodan Intel: API Key missing in .env"
    
    try:
        # First, try to resolve target to IP if it's a domain
        import socket
        try: ip = socket.gethostbyname(target)
        except: ip = target
        
        url = f"https://api.shodan.io/shodan/host/{ip}?key={SHODAN_API_KEY}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            ports = data.get('ports', [])
            org   = data.get('org', 'Unknown Org')
            os_info = data.get('os', 'Unknown OS')
            vulns = data.get('vulns', [])
            
            intel = f"[SHODAN] Node: {ip} | Org: {org} | OS: {os_info}\n"
            intel += f"[SHODAN] Public Open Ports: {', '.join(map(str, ports))}\n"
            if vulns:
                intel += f"[SHODAN] Public CVEs: {', '.join(vulns[:5])}\n"
            return intel
        elif response.status_code == 404:
            return "[SHODAN] No public exposure data found for this host."
        else:
            return f"[SHODAN] Lookup failed (Status: {response.status_code})"
    except Exception as e:
        return f"[!] Shodan Error: {str(e)}"

def get_vt_intel(target: str) -> str:
    """
    Queries VirusTotal for domain/URL reputation.
    """
    if not VT_API_KEY:
        return "[!] VirusTotal Intel: API Key missing in .env"
    
    try:
        # Cleanup target to domain
        domain = target.replace('http://', '').replace('https://', '').split('/')[0]
        
        url = f"https://www.virustotal.com/api/v3/domains/{domain}"
        headers = { "x-apikey": VT_API_KEY }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json().get('data', {})
            attr = data.get('attributes', {})
            stats = attr.get('last_analysis_stats', {})
            reputation = attr.get('reputation', 0)
            
            malicious = stats.get('malicious', 0)
            suspicious = stats.get('suspicious', 0)
            
            intel = f"[VIRUSTOTAL] Domain: {domain} | Reputation Score: {reputation}\n"
            intel += f"[VIRUSTOTAL] Analysis: Malicious: {malicious} | Suspicious: {suspicious} | Harmless: {stats.get('harmless', 0)}\n"
            
            if malicious > 0:
                intel += "[VIRUSTOTAL] ALERT: Host has been flagged as malicious by security vendors.\n"
            return intel
        elif response.status_code == 404:
            return "[VIRUSTOTAL] No reputation history found for this domain."
        else:
            return f"[VIRUSTOTAL] Lookup failed (Status: {response.status_code})"
    except Exception as e:
        return f"[!] VirusTotal Error: {str(e)}"

def get_combined_intel(target: str) -> str:
    """Entry point for the scan worker to get all external intelligence."""
    report = "── EXTERNAL INTELLIGENCE RECON ──\n"
    report += get_vt_intel(target) + "\n"
    report += get_shodan_intel(target) + "\n"
    report += "─────────────────────────────────\n"
    return report
