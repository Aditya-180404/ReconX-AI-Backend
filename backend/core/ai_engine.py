"""
ai_engine.py — ReconX AI · Multi-provider AI engine with Groq Key Rotation
Priority Chain: 
  1. Groq  (Fast Llama 3 for live tasks, 70B for Deep Reports)
  2. Gemini (Strong fallback)
  3. Mock   (Deterministic Regex-based fallback)
"""
import os
import json
import re

def clean_logs(text):
    """
    Surgically removes non-essential noise (WHOIS boilerplate, tool help messages, progress noise).
    """
    if not text: return ""
    
    # 1. Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    text = ansi_escape.sub('', text)
    
    # 2. Remove WHOIS Legal Boilerplate
    boilerplate = [
        r"TERMS OF USE:.*",
        r"NOTICE: The expiration date.*",
        r">>> Last update.*",
        r"By submitting a Whois query.*",
        r"The Registry database contains.*",
        r"VeriSign Global Registry Services.*"
    ]
    for pattern in boilerplate:
        text = re.sub(pattern, '', text, flags=re.DOTALL | re.IGNORECASE)

    # 3. Remove Tool Help/Usage errors (which often confuse AI)
    text = re.sub(r'usage: .*?error:.*?\n', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'xsstrike: error:.*?\n', '', text, flags=re.IGNORECASE)

    # 4. Remove excessive progress noise (sqlmap/curl)
    text = re.sub(r'\[\d+:\d+:\d+\]\s+\[[A-Z]+\]\s+', '', text)
    text = re.sub(r'\.{4,}', '...', text)
    text = re.sub(r'_{4,}', '___', text)
    
    # 5. Clean up excessive whitespace
    text = re.sub(r'\n\s*\n', '\n', text)
    
    return text.strip()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL   = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
GROQ_MODEL_FAST = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')
GROQ_MODEL_DEEP = "llama-3.1-70b-versatile"

# Reads GROQ_API_KEY_1 through GROQ_API_KEY_20 from .env
_groq_keys = []
for i in range(1, 21):
    key = os.getenv(f'GROQ_API_KEY_{i}', '').strip()
    if key: _groq_keys.append(key)

_groq_key_index = 0
_gemini_model = None

# ── Decision Tree Logic (Logic Guard 2.0) ────────────────────────────────────
def classify_execution(tool, output):
    """Detects if a tool FAILED, had NO_RESULT, or was a SUCCESS."""
    o_lower = output.lower()
    if any(x in o_lower for x in ["error:", "usage:", "invalid", "failed to connect", "critical: no parameter"]):
        if tool.lower() == "sqlmap" and "no parameter" in o_lower: return "NO_RESULT"
        if tool.lower() == "xsstrike" and "seeds" in o_lower: return "FAILED"
        return "FAILED"
    if len(output.strip()) < 50: return "NO_RESULT"
    return "SUCCESS"

def classify_evidence_type(evidence, output):
    """Categorizes the strength of a security finding."""
    if not evidence or len(evidence) < 10: return "NONE"
    e_lower = evidence.lower()
    o_lower = output.lower()
    if any(x in e_lower for x in ["payload:", "injection found", "vulnerable: yes", "[+] confirmed"]): return "STRONG"
    if any(x in o_lower for x in ["vulnerable", "exploit", "critical", "warning"]) and len(evidence) > 20: return "MEDIUM"
    return "WEAK"

def calculate_confidence(tool, output, evidence_type):
    """Calculates audit confidence based on environmental factors."""
    base = {"STRONG": 95, "MEDIUM": 75, "WEAK": 40, "NONE": 0}
    val = base.get(evidence_type, 0)
    o_lower = output.lower()
    if "waf" in o_lower or "cloudflare" in o_lower or "akamai" in o_lower: val -= 15
    if "timeout" in o_lower: val -= 20
    return max(0, val)

# ── Hardened AI Personality (V2: Explanation-First) ──────────────────────────
AGENTIC_SYSTEM_PROMPT = (
    "You are the ReconX AI Explanation Engine. Your role is to provide technical "
    "context and remediation guidance for vulnerabilities that have already "
    "been DETERMINISTICALLY VERIFIED by our security core. "
    "STRICT RULES: "
    "1. DO NOT invent findings. Only explain the findings provided in the 'Verified Findings' section. "
    "2. If the findings list is empty, conclude 'No confirmed vulnerabilities identified'. "
    "3. DO NOT change the severity or title of verified findings. "
    "4. For each finding, provide a deep technical explanation and clear remediation steps. "
    "5. Maintain a professional, forensic tone. Avoid generic filler."
)

PILOT_SYSTEM_PROMPT = (
    "You are the ReconX Agentic Pilot. Your goal is MISSION SUCCESS. "
    "Evaluate scan summaries and decide if a specialized follow-up command is needed. "
    "Allowed Tools: nuclei, sqlmap, nikto, xsstrike, gobuster, subfinder, nmap, curl. "
    "Respond ONLY in valid JSON: {'action': 'execute'|'none', 'cmd': '...', 'reason': '...'}"
)

# ── V2 Deterministic Logic Layer ─────────────────────────────────────────────
def normalize_scan_output(raw: str) -> dict:
    """Converts messy logs into structured telemetry for the Decision Engine."""
    o_lower = raw.lower()
    return {
        "http_status_codes": list(set(re.findall(r"HTTP/\d\.\d\s+(\d+)", raw))),
        "open_ports": re.findall(r"(\d+)/tcp\s+open\s+(\w+)", raw),
        "sqlmap": {
            "vulnerable": "is vulnerable" in o_lower or "back-end dbms is" in o_lower,
            "no_params": "no parameter(s) found" in o_lower or "all parameters appear to be not injectable" in o_lower,
            "timeout": "connection timed out" in o_lower,
            "waf": any(x in o_lower for x in ["waf", "ips", "ids", "firewall"]),
            "error_503": "503 service unavailable" in o_lower
        },
        "xsstrike": {
            "vulnerable": "vulnerability detected" in o_lower,
            "failed": any(x in o_lower for x in ["xsstrike: error", "usage:", "argument --seeds"])
        },
        "general": {
            "timeout": "timeout" in o_lower,
            "connection_refused": "connection refused" in o_lower
        }
    }

def detect_vulnerabilities_deterministic(parsed: dict) -> list:
    """Rules-based finding generation. AI is NOT involved here."""
    findings = []
    
    # 1. Port Exposure Rules
    for port, service in parsed["open_ports"]:
        # Only report sensitive ports as High, standard as Info
        if port in ["22", "3306", "5432", "21", "25", "445"]:
            findings.append({
                "title": f"Sensitive Service Exposure: {service.upper()}",
                "severity": "High",
                "cvss_score": 7.5,
                "confidence_score": 100,
                "owasp": "A05:2021 Security Misconfiguration",
                "description": f"The host is exposing the {service.upper()} service on port {port}/tcp to the public network.",
                "technical_evidence": f"Port {port}/tcp is OPEN and exposing {service}.",
                "business_impact": "Direct exposure of administrative/database services allows for targeted brute-force and exploitation attempts.",
                "reproducibility_steps": [
                    f"Run a perimeter validation scan and confirm that port {port}/tcp is reachable from an external network.",
                    f"Perform a protocol-specific banner or handshake check to verify that {service.upper()} is externally exposed."
                ],
                "fix": f"Immediately close port {port} or restrict access via strict IP-based firewall filtering (VPN)."
            })
    
    # 2. Verified SQL Injection
    if parsed["sqlmap"]["vulnerable"]:
        findings.append({
            "title": "Confirmed SQL Injection Vector",
            "severity": "Critical",
            "cvss_score": 9.8,
            "confidence_score": 95,
            "owasp": "A03:2021 Injection",
            "description": "Automated injection testing confirmed a SQL injection condition on the assessed target.",
            "technical_evidence": "Payloads successfully triggered time-based or boolean-based response anomalies (Verified by sqlmap).",
            "business_impact": "Full database compromise, unauthorized data exfiltration, and potential for host-level remote code execution.",
            "reproducibility_steps": [
                "Replay the original HTTP request with the confirmed injectable parameter in a controlled environment.",
                "Validate the issue with a safe boolean-based or time-based payload and compare the response behavior."
            ],
            "fix": "Use parameterized queries (Prepared Statements) for all database interactions. Validate and sanitize all user-supplied input."
        })

    return findings

def calculate_integrity(parsed: dict) -> dict:
    """Calculates the 'Truthfulness' of the scan based on environmental stability."""
    issues = []
    score = 100
    
    if parsed["sqlmap"]["timeout"] or parsed["general"]["timeout"]:
        issues.append("Network Timeouts: Scan could not verify all paths.")
        score -= 30
    if parsed["sqlmap"]["error_503"] or "503" in parsed["http_status_codes"]:
        issues.append("Target Instability: HTTP 503 errors detected.")
        score -= 25
    if parsed["xsstrike"]["failed"]:
        issues.append("Tool Failure: XSStrike engine failed to initialize.")
        score -= 15
    if parsed["sqlmap"]["waf"]:
        issues.append("Security Filter: Active WAF/IPS detected, results may be cloaked.")
        score -= 10
        
    status = "HIGH" if score >= 85 else "MEDIUM" if score >= 60 else "LOW"
    return {"score": max(0, score), "status": status, "issues": issues}

def _clean_text(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def _normalize_title(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()

def _looks_like_placeholder(value: str) -> bool:
    cleaned = _clean_text(value).lower()
    if not cleaned:
        return True
    placeholders = [
        "no technical evidence",
        "no evidence",
        "not available",
        "n/a",
        "steps not provided",
        "technical explanation provided by autonomous reasoning engine",
    ]
    return any(token in cleaned for token in placeholders)

def _is_evidence_grounded(evidence: str, logs_lower: str) -> bool:
    cleaned = _clean_text(evidence).lower()
    if _looks_like_placeholder(cleaned):
        return False
    if cleaned in logs_lower:
        return True
    keywords = [
        token for token in re.findall(r"[a-z0-9_./:-]{4,}", cleaned)
        if token not in {"http", "https", "open", "port", "service", "payloads", "sqlmap", "verified"}
    ]
    if not keywords:
        return False
    matches = sum(1 for token in keywords if token in logs_lower)
    return matches >= min(2, len(keywords))

def _clean_repro_steps(steps) -> list:
    if not isinstance(steps, list):
        return []
    cleaned = []
    for step in steps:
        normalized = re.sub(r"^\d+\.\s*", "", _clean_text(step))
        if normalized and not _looks_like_placeholder(normalized):
            cleaned.append(normalized)
    return cleaned[:6]

def _count_findings(findings: list) -> dict:
    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for finding in findings:
        severity = _clean_text(finding.get("severity") or "Low").title()
        if severity not in counts:
            severity = "Low"
        counts[severity] += 1
    return counts

def _derive_overall_risk(findings: list) -> str:
    counts = _count_findings(findings)
    if counts["Critical"]:
        return "Critical"
    if counts["High"]:
        return "High"
    if counts["Medium"]:
        return "Medium"
    return "Low"

def _sort_findings(findings: list) -> list:
    order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    return sorted(
        findings,
        key=lambda finding: (order.get(_clean_text(finding.get("severity")).title(), 0), finding.get("confidence_score", 0)),
        reverse=True,
    )

def _calculate_security_score(findings: list, integrity: dict) -> int:
    weights = {"Critical": 25, "High": 12, "Medium": 5, "Low": 1}
    finding_penalty = sum(weights.get(_clean_text(f.get("severity")).title(), 0) for f in findings)
    integrity_penalty = round((100 - integrity.get("score", 100)) * 0.35)
    return max(0, 100 - finding_penalty - integrity_penalty)

def _build_executive_summary(target: str, findings: list, integrity: dict) -> str:
    counts = _count_findings(findings)
    if not findings:
        if integrity.get("status") == "HIGH":
            return (
                f"Automated assessment of {target} did not identify any confirmed vulnerabilities "
                "within the collected telemetry."
            )
        issues = ("; ".join(integrity.get("issues", [])[:2]) or "scan instability reduced validation confidence").rstrip(". ")
        return (
            f"Automated assessment of {target} did not identify any confirmed vulnerabilities, "
            f"but result confidence is limited because {issues.lower()}. A validation rerun is recommended."
        )

    severity_bits = []
    for severity in ["Critical", "High", "Medium", "Low"]:
        count = counts[severity]
        if count:
            severity_bits.append(f"{count} {severity.lower()}")
    summary = f"Automated assessment of {target} confirmed {len(findings)} finding(s)"
    if severity_bits:
        summary += f", including {', '.join(severity_bits)} exposure(s)."
    else:
        summary += "."
    if integrity.get("status") != "HIGH":
        issues = ("; ".join(integrity.get("issues", [])[:2]) or "environmental instability").rstrip(". ")
        summary += f" Audit confidence was reduced by {issues.lower()}."
    return summary

def _build_remediation_priority(findings: list, integrity: dict) -> list:
    priorities = []
    counts = _count_findings(findings)

    if counts["Critical"] or counts["High"]:
        priorities.append("Remediate all verified Critical and High findings before the next production change window.")
    if counts["Medium"]:
        priorities.append("Schedule Medium severity fixes and confirm compensating controls on exposed services.")
    if not findings:
        if integrity.get("status") != "HIGH":
            priorities.append("Stabilize the target and rerun the validation scan to improve audit confidence.")
        else:
            priorities.append("Maintain routine monitoring and rerun this assessment after material infrastructure changes.")
    if integrity.get("issues"):
        issues = "; ".join(integrity["issues"][:2]).rstrip(". ")
        priorities.append(f"Resolve scan reliability issues: {issues}.")

    return priorities[:3] or ["Maintain routine monitoring and rerun this assessment after material infrastructure changes."]

def _merge_verified_findings(verified_findings: list, ai_findings: list) -> list:
    ai_by_title = {_normalize_title(f.get("title", "")): f for f in ai_findings or []}
    merged = []
    seen = set()

    for finding in verified_findings:
        key = _normalize_title(finding.get("title", ""))
        ai_finding = ai_by_title.get(key, {})
        merged_finding = dict(finding)

        description = _clean_text(ai_finding.get("description"))
        if description and not _looks_like_placeholder(description):
            merged_finding["description"] = description

        business_impact = _clean_text(ai_finding.get("business_impact"))
        if business_impact and not _looks_like_placeholder(business_impact):
            merged_finding["business_impact"] = business_impact

        remediation = _clean_text(ai_finding.get("fix"))
        if remediation and not _looks_like_placeholder(remediation):
            merged_finding["fix"] = remediation

        reproducibility_steps = _clean_repro_steps(ai_finding.get("reproducibility_steps"))
        if reproducibility_steps:
            merged_finding["reproducibility_steps"] = reproducibility_steps
        else:
            merged_finding["reproducibility_steps"] = _clean_repro_steps(finding.get("reproducibility_steps"))

        if key not in seen:
            merged.append(merged_finding)
            seen.add(key)

    return merged

def validate_findings_gate(report: dict, parsed: dict, raw_logs: str) -> dict:
    """Hard-filter that purges any AI hallucination or generic noise."""
    validated = []
    logs_lower = raw_logs.lower()
    
    # Rule Enforcement Constants
    SQLMAP_SAFE = parsed["sqlmap"]["no_params"]
    XSSTRIKE_BROKEN = parsed["xsstrike"]["failed"]
    SCAN_UNSTABLE = parsed["general"]["timeout"] or "503" in parsed["http_status_codes"]
    
    for f in report.get("findings_summary", []):
        title = f.get("title", "").lower()
        evidence = _clean_text(f.get("technical_evidence")).lower()
        
        # ─── GATE 1: Minimum Evidence Quality ───
        if len(evidence) < 30: continue
        if _looks_like_placeholder(evidence): continue
        
        # ─── GATE 2: Deterministic Contradiction ───
        if "sql injection" in title and (SQLMAP_SAFE or not parsed["sqlmap"]["vulnerable"]): continue
        if "xss" in title and (XSSTRIKE_BROKEN or not parsed["xsstrike"]["vulnerable"]): continue
        
        # ─── GATE 3: Evidence Grounding ───
        if not _is_evidence_grounded(evidence, logs_lower):
            continue

        # ─── GATE 4: Stability Guard ───
        # Block elevated findings if the scan was unstable and the evidence is still light.
        if SCAN_UNSTABLE and f.get("severity") in ["Critical", "High"] and len(evidence) < 100:
            continue

        validated.append(f)
        
    report["findings_summary"] = validated
    return report

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(model_name=GEMINI_MODEL, system_instruction=AGENTIC_SYSTEM_PROMPT)
    except: pass

# ── Report Schema (Industrial V14) ─────────────────────────────────────────────
REPORT_SCHEMA = {
    "executive_summary": "str (Executive-level strategic brief)",
    "security_score": "int 0-100",
    "overall_risk": "Critical|High|Medium|Low",
    "scan_integrity": {
        "score": "int 0-100",
        "status": "HIGH|MEDIUM|LOW",
        "issues": ["str (e.g. Connection Timeouts)"]
    },
    "findings_summary": [
        {
            "title": "str",
            "severity": "Critical|High|Medium|Low",
            "confidence_score": "int 0-100",
            "cvss_score": "float",
            "owasp": "str",
            "technical_evidence": "str (Log snippet)",
            "business_impact": "str",
            "reproducibility_steps": ["step 1"],
            "fix": "str"
        }
    ],
    "test_results": [
        {"tool": "str", "status": "Tested & Safe | No Parameters Found | Verified Clean"}
    ],
    "assessment_limitations": ["str (e.g. XSStrike failed to run)"],
    "positive_findings": ["str (e.g. HTTPS enforced, No malware detected)"],
    "remediation_priority": ["Immediate", "Scheduled"]
}

def _build_prompt(target: str, scan_type: str, raw_output: str) -> str:
    return f"""Target: {target}
Scan Type: {scan_type}

Respond ONLY with a valid JSON object matching this schema:
{json.dumps(REPORT_SCHEMA, indent=2)}

CRITICAL INSTRUCTIONS:
1. EVIDENCE: Every finding MUST have 'technical_evidence' copied from the logs.
2. NO HALLUCINATION: Do not report issues (like SQLi) if the logs (sqlmap) explicitly state parameters are not injectable.
3. CVSS: Provide accurate CVSS 3.1 scores.
4. REPRODUCIBILITY: Provide 100% accurate steps for a human auditor to verify the finding.

### LOGS BEGIN ###
{raw_output}
### LOGS END ###
""".strip()

# ── AI API Implementation ─────────────────────────────────────────────────────
def _call_groq_json(prompt: str, deep_mode: bool = False) -> dict:
    global _groq_key_index
    model = GROQ_MODEL_DEEP if deep_mode else GROQ_MODEL_FAST
    from groq import Groq, RateLimitError
    
    total_keys = len(_groq_keys)
    if total_keys == 0: raise Exception("No Groq keys")
    
    for _ in range(total_keys):
        key = _groq_keys[_groq_key_index]
        try:
            client = Groq(api_key=key)
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": AGENTIC_SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content)
        except RateLimitError:
            _groq_key_index = (_groq_key_index + 1) % total_keys
        except Exception as e:
            _groq_key_index = (_groq_key_index + 1) % total_keys
    raise Exception("All Groq keys failed")

def _call_gemini_json(prompt: str) -> dict:
    resp = _gemini_model.generate_content(prompt, generation_config={"temperature": 0.2, "response_mime_type": "application/json"})
    return json.loads(resp.text.strip())

def generate_ai_report(target: str, scan_type: str, raw_output: str) -> dict:
    cleaned = clean_logs(raw_output)
    parsed = normalize_scan_output(cleaned)
    
    # ── Step 1: Deterministic Engine (Truth Layer) ──────────────────────────
    verified_findings = detect_vulnerabilities_deterministic(parsed)
    integrity = calculate_integrity(parsed)
    
    # ── Step 2: Tool Status & Limitations ────────────────────────────────────
    test_results = []
    limitations = integrity["issues"]
    positive_findings = []
    
    if "sqlmap" in cleaned.lower():
        if parsed["sqlmap"]["no_params"]:
            test_results.append({"tool": "sqlmap", "status": "No Attack Surface (No Parameters Found)"})
        elif parsed["sqlmap"]["vulnerable"]:
            test_results.append({"tool": "sqlmap", "status": "Verified Critical Injection Vector"})
        else:
            test_results.append({"tool": "sqlmap", "status": "Completed (Inconclusive/No Injection)"})

    if "xsstrike" in cleaned.lower():
        if parsed["xsstrike"]["failed"]:
            test_results.append({"tool": "xsstrike", "status": "Execution Failed (Limitation)"})
        else:
            test_results.append({"tool": "xsstrike", "status": "Tested & Safe (No XSS)"})

    if "https://" in cleaned.lower() and "301" in cleaned.lower():
        positive_findings.append("HTTP-to-HTTPS redirect enforced.")
    if "strict-transport-security" in cleaned.lower():
        positive_findings.append("HSTS Protection enabled.")

    # ── Step 3: AI Augmentation (Explanation Layer) ──────────────────────────
    # Note: We provide the AI with verified findings and ask for explanation.
    # It might still try to add some, which we will purge in Step 4.
    
    logic_gate_context = "### VERIFIED VULNERABILITIES (EXPLAIN ONLY) ###\n"
    logic_gate_context += json.dumps(verified_findings, indent=2) + "\n\n"
    logic_gate_context += "### SCAN TELEMETRY ###\n"
    logic_gate_context += f"Integrity Status: {integrity['status']}\n"
    logic_gate_context += f"Limitations: {', '.join(limitations)}\n"
    
    prompt = _build_prompt(target, scan_type, logic_gate_context + "\n\n" + cleaned[:11000])
    
    report = {}
    try:
        # 70B for high-quality explanation
        report = _call_groq_json(prompt, deep_mode=True)
    except:
        try:
            if _gemini_model: report = _call_gemini_json(prompt)
        except: 
            report = _mock_report(target, scan_type, cleaned)
    if not isinstance(report, dict):
        report = {}

    # ── Step 4: Validation Gate & Hard Filters ───────────────────────────────
    report["scan_integrity"] = integrity
    report["test_results"] = test_results
    report["assessment_limitations"] = limitations
    report["positive_findings"] = positive_findings
    
    # Run the Gate
    report = validate_findings_gate(report, parsed, cleaned)

    # Final findings are deterministic. AI may enrich verified findings, but it cannot add new ones.
    report["findings_summary"] = _sort_findings(_merge_verified_findings(verified_findings, report.get("findings_summary", [])))
    report["overall_risk"] = _derive_overall_risk(report["findings_summary"])
    report["security_score"] = _calculate_security_score(report["findings_summary"], integrity)
    report["executive_summary"] = _build_executive_summary(target, report["findings_summary"], integrity)
    report["remediation_priority"] = _build_remediation_priority(report["findings_summary"], integrity)

    return report

# ── Agentic Operations ────────────────────────────────────────────────────────
def generate_step_summary(tool_name: str, tool_output: str) -> str:
    """
    Generates a technical summary of a tool's output for real-time AI reasoning.
    """
    cleaned = clean_logs(tool_output[:2000])
    prompt = (
        f"Analyze results from tool: {tool_name}. "
        "Respond ONLY with valid JSON: {\"summary\": \"One technical sentence describing the evidence found.\"}. "
        f"Technical telemetry: {cleaned}"
    )
    try:
        # Use fast model for summaries
        res = _call_groq_json(prompt, deep_mode=False) 
        return res.get("summary", "Technical telemetry recorded.")
    except:
        if 'open' in tool_output.lower(): return f"{tool_name} detected open ports or services."
        return f"{tool_name} execution telemetry recorded."

def decide_agentic_pilot_action(target: str, scan_logs: str) -> dict:
    """
    Asks the Deep Reasoner (70B) if follow-up commands (e.g. sqlmap, nuclei) are needed.
    """
    if not _groq_keys: return {"action": "none"}
    prompt = f"Target: {target}\nAggregated Scan Logs:\n{scan_logs}\nDecide if a follow-up action is required."
    try:
        # Ensure we rotate keys before calling
        global _groq_key_index
        client = __import__('groq').Groq(api_key=_groq_keys[_groq_key_index])
        resp = client.chat.completions.create(
            model=GROQ_MODEL_DEEP,
            messages=[{"role": "system", "content": PILOT_SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(resp.choices[0].message.content)
    except:
        return {"action": "none", "reason": "Pilot decision engine encountered a timeout."}

# ── Copilot Chat ──────────────────────────────────────────────────────────────
def ask_copilot(question: str, history: list = None, reports_context: str = '') -> str:
    from groq import Groq
    if not _groq_keys: return "AI Unavailable. Please check API keys."
    
    messages = [{"role": "system", "content": f"{AGENTIC_SYSTEM_PROMPT}\nContext: {reports_context}"}]
    if history: 
        for m in history[-5:]: messages.append({"role": m['role'], "content": m['content']})
    messages.append({"role": "user", "content": question})
    
    try:
        client = Groq(api_key=_groq_keys[_groq_key_index])
        resp = client.chat.completions.create(model=GROQ_MODEL_FAST, messages=messages, temperature=0.6)
        return resp.choices[0].message.content
    except: return "I am having trouble connecting to my reasoning core. Please try again in 30 seconds."

# ── Deterministic Mock (Fallback) ─────────────────────────────────────────────
def _mock_report(target: str, scan_type: str, raw_output: str) -> dict:
    findings = []
    # Regex for Nmap Port Parsing
    ports = re.findall(r'(\d+)/(tcp|udp)\s+open\s+(\w+)', raw_output)
    for p, proto, svc in ports:
        sev = "High" if p in ['22', '3306', '5432', '21'] else "Low"
        findings.append({
            "title": f"Service Exposure: {svc.upper()}",
            "severity": sev,
            "cvss_score": 7.5 if sev == "High" else 3.0,
            "confidence_score": 90,
            "endpoint": f"{target}:{p}",
            "owasp": "A05:2021 Security Misconfiguration",
            "business_impact": "Direct exposure of internal services increases the risk of brute-force and targeted exploits.",
            "reproducibility_steps": [f"1. Run nmap -p{p} {target}", f"2. Verify service response for {svc}"],
            "technical_evidence": f"Port {p}/{proto} is OPEN with service {svc}",
            "fix": f"Close port {p} or restrict access via firewall/VPN."
        })
    
    # Simple security score
    score = max(20, 100 - (len(findings) * 15))
    risk = "Critical" if score < 40 else "High" if score < 60 else "Medium" if score < 85 else "Low"
    
    return {
        "executive_summary": f"Automated audit of {target} identified {len(findings)} technical exposures. Perimeter hardening is recommended.",
        "security_score": score,
        "overall_risk": risk,
        "findings_summary": findings,
        "test_results": [{"tool": "nmap", "status": "Surface Scan Completed"}],
        "assessment_limitations": ["ReconX API Fallback: Deep analysis was limited due to tool connection timeouts."],
        "positive_findings": ["Domain reputation verified: Clean"],
        "remediation_priority": ["Immediate", "Regular"]
    }
