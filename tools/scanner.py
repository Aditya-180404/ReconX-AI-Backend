"""
scanner.py — Main scan pipeline orchestrator
Calls individual tool wrappers sequentially, aggregates results,
and returns a unified dict for the AI engine.
"""
import os
import re
from tools.nmap_wrapper      import run_nmap
from tools.nikto_wrapper     import run_nikto
from tools.nuclei_wrapper    import run_nuclei
from tools.subfinder_wrapper import run_subfinder
from tools.whois_wrapper     import run_whois
from tools.header_wrapper    import run_headers

# ── Severity heuristics based on keyword matching ────────────────────────────
CRITICAL_PATTERNS = [r'\.env', r'sql injection', r'log4shell', r'rce', r'remote code', r'cve-202[0-9]']
HIGH_PATTERNS     = [r'admin panel', r'open redirect', r'xss', r'csrf', r'weak cipher', r'port 8080', r'port 3306']
MEDIUM_PATTERNS   = [r'missing.*csp', r'missing.*header', r'cors', r'clickjack', r'hsts', r'port 22', r'port 25']
LOW_PATTERNS      = [r'cookie.*httponly', r'cookie.*secure', r'samesite', r'robots\.txt', r'sitemap']

def _classify_severity(text: str) -> str:
    tl = text.lower()
    if any(re.search(p, tl) for p in CRITICAL_PATTERNS): return 'Critical'
    if any(re.search(p, tl) for p in HIGH_PATTERNS):     return 'High'
    if any(re.search(p, tl) for p in MEDIUM_PATTERNS):   return 'Medium'
    return 'Low'

def _score_from_findings(findings: list[dict]) -> int:
    """Compute a 0-100 security score from finding severity counts."""
    weights = {'Critical': 25, 'High': 12, 'Medium': 5, 'Low': 1}
    penalty  = sum(weights.get(f['severity'], 0) for f in findings)
    return max(0, 100 - penalty)

def _risk_label(score: int) -> str:
    if score < 40: return 'Critical'
    if score < 60: return 'High'
    if score < 80: return 'Medium'
    return 'Low'

# ── Scan type config ─────────────────────────────────────────────────────────
SCAN_CONFIG = {
    'Quick':      {'nmap': True,  'nikto': False, 'nuclei': False, 'subfinder': False, 'whois': True, 'headers': True},
    'Deep':       {'nmap': True,  'nikto': True,  'nuclei': True,  'subfinder': True,  'whois': True, 'headers': True},
    'Compliance': {'nmap': True,  'nikto': True,  'nuclei': False, 'subfinder': False, 'whois': True, 'headers': True},
}


def run_scan_pipeline(target: str, scan_type: str = 'Quick') -> dict:
    """
    Orchestrates the full scan pipeline.

    Returns:
        {
          'raw':      str,           # concatenated raw tool output
          'findings': list[dict],    # parsed findings
          'score':    int,
          'risk':     str,
        }
    """
    cfg = SCAN_CONFIG.get(scan_type, SCAN_CONFIG['Quick'])
    raw_parts: list[str] = []
    findings:  list[dict] = []

    # ── Whois recon ──────────────────────────────────────────────────────────
    if cfg['whois']:
        out = run_whois(target)
        raw_parts.append(f"=== WHOIS ===\n{out}")

    # ── Subfinder ─────────────────────────────────────────────────────────────
    if cfg['subfinder']:
        out = run_subfinder(target)
        raw_parts.append(f"=== SUBFINDER ===\n{out}")
        if out and 'error' not in out.lower():
            # Each discovered subdomain is a Low informational finding
            for sub in out.strip().splitlines()[:20]:
                if sub.strip():
                    findings.append({'severity': 'Low', 'title': f'Subdomain Discovered: {sub.strip()}',
                                     'endpoint': sub.strip(), 'fix': 'Ensure all subdomains have security policies applied.'})

    # ── Nmap ─────────────────────────────────────────────────────────────────
    if cfg['nmap']:
        out = run_nmap(target, stealth=(scan_type == 'Stealth'))
        raw_parts.append(f"=== NMAP ===\n{out}")
        # Parse open ports
        for line in out.splitlines():
            if '/tcp' in line and 'open' in line:
                port_info = line.strip()
                sev = _classify_severity(port_info)
                findings.append({'severity': sev,
                                 'title': f'Open Port: {port_info}',
                                 'endpoint': port_info.split('/')[0],
                                 'fix': 'Close unnecessary ports. Use firewall rules to restrict access.'})

    # ── Nikto ────────────────────────────────────────────────────────────────
    if cfg['nikto']:
        out = run_nikto(target)
        raw_parts.append(f"=== NIKTO ===\n{out}")
        for line in out.splitlines():
            if line.startswith('+ ') and len(line) > 10:
                sev = _classify_severity(line)
                findings.append({'severity': sev,
                                 'title': line[2:120].strip(),
                                 'endpoint': '/',
                                 'fix': 'Review the Nikto finding and apply the relevant CIS/OWASP mitigation.'})

    # ── Nuclei ───────────────────────────────────────────────────────────────
    if cfg['nuclei']:
        out = run_nuclei(target)
        raw_parts.append(f"=== NUCLEI ===\n{out}")
        for line in out.splitlines():
            if '[' in line and ']' in line:
                sev = _classify_severity(line)
                findings.append({'severity': sev,
                                 'title': line.strip()[:180],
                                 'endpoint': target,
                                 'fix': 'Refer to the Nuclei template description for recommended remediation.'})

    raw      = '\n\n'.join(raw_parts) or 'No tool output collected.'
    score    = _score_from_findings(findings)
    risk     = _risk_label(score)

    return {'raw': raw, 'findings': findings, 'score': score, 'risk': risk}
