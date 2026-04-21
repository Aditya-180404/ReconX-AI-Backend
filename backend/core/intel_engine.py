import os
import requests
import json

SHODAN_API_KEY = os.getenv('SHODAN_API_KEY', '')
VT_API_KEY     = os.getenv('VT_API_KEY', '')

def get_shodan_intel(target: str) -> str:
    """
    Queries Shodan for public exposure data using expert library patterns.
    """
    if not SHODAN_API_KEY:
        return "[!] Shodan Intel: API Key missing in .env"
    
    try:
        import shodan
        api = shodan.Shodan(SHODAN_API_KEY)
        
        # Resolve IP
        import socket
        try: ip = socket.gethostbyname(target)
        except: ip = target
        
        # Expert check: Host lookup
        host = api.host(ip)
        
        org     = host.get('org', 'Unknown Org')
        os_info = host.get('os', 'Unknown OS')
        ports   = host.get('ports', [])
        vulns   = host.get('vulns', [])
        
        # Expert check: Honeypot probability
        h_score = 0
        try: h_score = api.honeyscore(ip)
        except: pass

        intel = f"[SHODAN] Node: {ip} | Org: {org} | OS: {os_info} | Reliability: {1.0 - h_score:.2f}\n"
        intel += f"[SHODAN] Public Open Ports: {', '.join(map(str, ports))}\n"
        
        if vulns:
            intel += f"[SHODAN] Identified CVEs: {', '.join(vulns[:8])}\n"
            
        # Banner Recon (Top 3)
        intel += "[SHODAN] Service Banners:\n"
        for data in host.get('data', [])[:3]:
            port = data.get('port')
            product = data.get('product', 'unknown')
            version = data.get('version', '')
            intel += f"  - {port}/tcp: {product} {version}\n"
            
        return intel
    except ImportError:
        return "[!] Shodan Error: shodan library not installed. pip install shodan"
    except Exception as e:
        # Check for specific API error without importing if shodan not found
        msg = str(e)
        if "No information" in msg:
            return "[SHODAN] No public exposure data found for this host."
        return f"[SHODAN] Error: {msg}"


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
