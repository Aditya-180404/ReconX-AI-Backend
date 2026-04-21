import sys
import os
import json

# Ensure we can import from core
sys.path.append(os.getcwd())

try:
    from core.ai_engine import (
        normalize_scan_output,
        detect_vulnerabilities_deterministic,
        validate_findings_gate,
        generate_ai_report,
    )
except ImportError:
    print("Error: Could not import core modules. Run this from the /backend directory.")
    sys.exit(1)

def run_diagnostic():
    print("--- RECONX V2 INTEGRATED ENGINE DIAGNOSTIC ---")
    
    # scenario: Unstable target with generic AI findings
    mock_logs = """
    Target: scanme.nmap.org
    HTTP/1.1 503 Service Unavailable
    3306/tcp open mysql
    sqlmap: no parameter(s) found
    """
    
    print("[1] Normalizing Logs...")
    parsed = normalize_scan_output(mock_logs)
    print(f"    - Integrity Detected: {parsed['http_status_codes']}")
    print(f"    - DB Exposed: {any(p[0]=='3306' for p in parsed['open_ports'])}")

    print("\n[2] Testing Deterministic Engine...")
    verified = detect_vulnerabilities_deterministic(parsed)
    print(f"    - Findings Identified: {[f['title'] for f in verified]}")

    print("\n[3] Testing Validation Gate (Anti-Hallucination)...")
    hallucinated_report = {
        "findings_summary": [
            {
                "title": "SQL Injection",
                "severity": "Critical",
                "technical_evidence": "Generic error triggered", 
            }
        ]
    }
    
    purged_report = validate_findings_gate(hallucinated_report, parsed, mock_logs)
    
    if len(purged_report["findings_summary"]) == 0:
        print("    - SUCCESS: Hallucinated SQLi was correctly PURGED.")
    else:
        print("    - FAIL: SQLi finding leaked through.")

    print("\n[4] Testing Full Report Synthesis (Juice Shop Failure Case)...")
    unstable_logs = """
    HTTP/1.1 503 Service Unavailable
    80/tcp open http
    443/tcp open https
    [23:07:21] [WARNING] the web server responded with an HTTP error code (503)
    [23:07:25] [CRITICAL] no parameter(s) found for testing in the provided data
    xsstrike: error: argument --seeds: expected one argument
    """
    report = generate_ai_report("juice-shop.herokuapp.com", "Quick", unstable_logs)
    finding_titles = [f["title"] for f in report.get("findings_summary", [])]
    print(f"    - Final Findings: {finding_titles or '[]'}")
    print(f"    - Overall Risk: {report.get('overall_risk')}")
    print(f"    - Security Score: {report.get('security_score')}")
    print(f"    - Executive Summary: {report.get('executive_summary')}")

    if finding_titles:
        print("    - FAIL: Unsupported findings survived the full report pipeline.")
    else:
        print("    - SUCCESS: No unsupported findings were emitted for the unstable Juice Shop scenario.")

    print("\n--- DIAGNOSTIC COMPLETE ---")

if __name__ == "__main__":
    run_diagnostic()
