"""
ReconX AI — Professional Hacking Engine (V12.2 FINAL)
Feature Set: Live Streaming, Process Killing, Multi-Toolchain, AI Synthesis & Threat Feed
"""
import threading
import json
import sys
import os
import subprocess
import time
import shutil
import re
from flask import Blueprint, request, jsonify, g
from core.database import get_db_connection
from core.auth import require_auth
from core.ai_engine import generate_ai_report, generate_step_summary

scan_bp = Blueprint('scan_bp', __name__)
_last_scan: dict[int, float] = {}
 
# ── OPERATOR VISIBILITY (Live Terminal) ────────────────────────────────────
def launch_live_terminal(log_file, scan_id):
    """Detects installed terminal emulator and pops a live log viewer."""
    try:
        # Priority: qterminal (Parrot) -> mate-terminal -> xterm
        terms = [
            ('qterminal', ['qterminal', '-e', f'tail -f {log_file}']),
            ('mate-terminal', ['mate-terminal', '--command', f'tail -f {log_file}']),
            ('xterm', ['xterm', '-T', f'ReconX LIVE :: Scan {scan_id}', '-e', f'tail -f {log_file}']),
        ]
        chosen = None
        for name, cmd in terms:
            if shutil.which(name):
                chosen = cmd
                break
        
        if chosen:
            # We explicitly target DISPLAY :0 for GUI popups in Linux
            env = os.environ.copy()
            env["DISPLAY"] = ":0"
            # Use nohup and setsid to ensure the terminal lives independently of the flask thread
            subprocess.Popen(['setsid'] + chosen, start_new_session=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"[UI] Live Terminal launched using {chosen[0]} on DISPLAY :0")
    except Exception as e:
        print(f"[UI] Terminal launch failed: {e}")

# ── LOGGING ENGINE ──────────────────────────────────────────────────────────
def update_db_logs(scan_id, new_text, log_file, cursor=None):
    """Streams data to Console, File, and Database simultaneously. Returns logged text."""
    sys.stdout.write(new_text)
    sys.stdout.flush()
    try:
        with open(log_file, "a") as f:
            f.write(new_text)
    except: pass
    
    try:
        if cursor:
            cursor.execute("UPDATE scans SET raw_output = CONCAT(IFNULL(raw_output, ''), %s) WHERE id = %s", (new_text, scan_id))
        else:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("UPDATE scans SET raw_output = CONCAT(IFNULL(raw_output, ''), %s) WHERE id = %s", (new_text, scan_id))
                conn.commit()
                conn.close()
    except Exception as e:
        print(f"[LOG ERROR] {e}")
    return new_text

def is_stopped(scan_id, cursor=None):
    """Checks if the operator has requested a termination."""
    try:
        if cursor:
            cursor.execute("SELECT status FROM scans WHERE id = %s", (scan_id,))
            res = cursor.fetchone()
            # If cursor is dictionary=True, res is a dict, else a tuple
            status = res['status'] if isinstance(res, dict) else res[0]
            return status in ['Stopping', 'Failed']
        
        conn = get_db_connection()
        if not conn: return False
        cur = conn.cursor()
        cur.execute("SELECT status FROM scans WHERE id = %s", (scan_id,))
        res = cur.fetchone()
        conn.close()
        return res and res[0] in ['Stopping', 'Failed']
    except Exception as e:
        print(f"[CHECK ERROR] {e}")
        return False

def stream_tool(name, cmd, scan_id, log_file, cursor=None):
    """Executes an external tool and mirrors stdout line-by-line."""
    if not shutil.which(cmd[0]):
        update_db_logs(scan_id, f"[!] FATAL: Tool '{cmd[0]}' not found. Skipping {name}.\n", log_file, cursor)
        return ""
    
    update_db_logs(scan_id, f"[*] INITIATING: {' '.join(cmd)}\n", log_file, cursor)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    output = ""
    
    for line in iter(proc.stdout.readline, ''):
        update_db_logs(scan_id, line, log_file, cursor)
        output += line
        if is_stopped(scan_id, cursor):
            update_db_logs(scan_id, f"\n[!] TERMINATING {name} PROCESS...\n", log_file, cursor)
            proc.terminate()
            return output + "\n[!] PROCESS KILLED BY OPERATOR."
    
    proc.wait()
    return output

# ── AGENTIC WORKER ────────────────────────────────────────────────────────────
def _scan_worker(scan_id, target, scan_type, user_id, custom_params=None):
    # Dynamic Log Path (Portable)
    log_dir = os.path.join(os.getcwd(), 'logs')
    log_file = os.path.join(log_dir, f"audit_{scan_id}.log")
    
    conn = get_db_connection()
    if not conn:
        print(f"[CRITICAL] Database unavailable for scan #{scan_id}")
        return

    cur = conn.cursor(dictionary=True)
    conn.autocommit = True # CRITICAL: Prevents 'Lock wait timeout exceeded'
    
    try:
        cur.execute("UPDATE scans SET status = 'Running' WHERE id = %s", (scan_id,))
        
        with open(log_file, "w") as f:
            f.write(f"RECON-X AI | TARGET AUDIT trail: {target}\n")
            f.write("──────────────────────────────────────────────────────────\n\n")

        # Launch physical terminal for judge visibility
        launch_live_terminal(log_file, scan_id)

        update_db_logs(scan_id, f"[*] MISSION START :: MODE={scan_type}\n[*] Target: {target}\n[*] ──────────────────────────────────────────────\n", log_file, cur)
        
        # Clear/Reset AI Insights for a fresh run
        cur.execute("UPDATE scans SET ai_insight = '• ReconX Engine initialized. Starting OSINT collection...\n' WHERE id = %s", (scan_id,))
        cfg = {}
        if scan_type == 'Custom': 
            cfg = custom_params or {}
            if not any(cfg.values()):
                update_db_logs(scan_id, "[!] WARNING: No tools selected. Defaulting to Quick Scan.\n", log_file, cur)
                cfg = {'shodan': True, 'vt': True, 'whois': True, 'headers': True, 'nmap': True, 'sqlmap': True}
        elif scan_type == 'Phishing': cfg = {'shodan': True, 'vt': True, 'whois': True, 'headers': True}
        elif scan_type == 'Quick':    cfg = {'shodan': True, 'vt': True, 'whois': True, 'headers': True, 'nmap': True, 'sqlmap': True, 'xss': True}
        else:                         cfg = {'shodan': True, 'vt': True, 'whois': True, 'headers': True, 'subfinder': True, 'nmap': True, 'nikto': True, 'sqlmap': True, 'xss': True, 'zap': True, 'dos': True, 'nuclei': True}

        update_db_logs(scan_id, f"[*] CONFIG LOADED: {', '.join([k for k,v in cfg.items() if v])}\n", log_file, cur)

        raw_logs = ""
        
        # --- EXECUTION PHASES ---
        tools = [
            ('shodan',    'SHODAN INTEL',       []), # Special handle
            ('vt',        'VIRUSTOTAL INTEL',   []), # Special handle
            ('whois',     'WHOIS OSINT',        ['whois', target]),
            ('headers',   'HTTP HEADERS',      ['curl', '-I', '--max-time', '10', target]),
            ('subfinder', 'SUBDOMAIN DISCOVERY', ['subfinder', '-d', target, '-silent']),
            ('nmap',      'PORT SCAN',          ['nmap', '-T4', '-F' if scan_type == 'Quick' else '-sV', '--open', target]),
            ('nikto',     'WEB SCRAPING',       ['nikto', '-h', target, '-nointeractive']),
            ('sqlmap',    'SQL INJECTION',      ['sqlmap', '-u', target, '--batch', '--random-agent', '--level=1']),
            ('nuclei',    'VULN TEMPLATES',    ['nuclei', '-u', target, '-severity', 'critical,high,medium', '-silent']),
            ('zap',       'ZAP AUDIT',          ['zap-baseline.py', '-t', target if 'http' in target else f"http://{target}", '-m', '1']),
            ('xss',       'XSS REFLECTION',     ['xsstrike', '-u', target, '--seeds', '--skip-dom']),
            ('dos',       'DOS RESILIENCE',     ['slowhttptest', '-c', '50', '-u', target, '-r', '100', '-t', 'GET', '-l', '20']),
        ]

        cumulative_insight = ""
        for key, label, cmd in tools:
            if cfg.get(key) and not is_stopped(scan_id, cur):
                # Update status tracker
                try: cur.execute("UPDATE scans SET current_tool = %s WHERE id = %s", (label, scan_id))
                except: pass
                
                update_db_logs(scan_id, f"\n[*] PHASE: {label}\n", log_file, cur)
                
                # Real-time AI Status Update (IMMEDIATE)
                cur.execute("UPDATE scans SET ai_insight = CONCAT(IFNULL(ai_insight, ''), %s), current_tool = %s WHERE id = %s", 
                            (f"• Agent analyzing {label} telemetry...\n", label, scan_id))
                if key == 'shodan':
                    from core.intel_engine import get_shodan_intel
                    tool_output = get_shodan_intel(target)
                    update_db_logs(scan_id, tool_output + "\n", log_file, cur)
                elif key == 'vt':
                    from core.intel_engine import get_vt_intel
                    tool_output = get_vt_intel(target)
                    update_db_logs(scan_id, tool_output + "\n", log_file, cur)
                else:
                    tool_output = stream_tool(key.upper(), cmd, scan_id, log_file, cur)
                
                raw_logs += tool_output
                
                # Generate Incremental AI Insight
                if tool_output.strip():
                    step_insight = generate_step_summary(label, tool_output)
                    cumulative_insight += f"• {step_insight}\n"
                    try: cur.execute("UPDATE scans SET ai_insight = %s WHERE id = %s", (cumulative_insight, scan_id))
                    except: pass

        # --- AGENTIC PILOT PHASE (Reflection & Autonomous Control) ---
        WHITELIST = ['nuclei', 'sqlmap', 'nikto', 'xsstrike', 'gobuster', 'subfinder', 'nmap', 'curl']
        if not is_stopped(scan_id, cur) and scan_type != 'Phishing':
            try:
                cur.execute("UPDATE scans SET current_tool = 'Agentic Pilot' WHERE id = %s", (scan_id,))
                update_db_logs(scan_id, "\n[*] PHASE: AGENTIC PILOT (Reflection & Strategy)\n", log_file, cur)
                
                from core.ai_engine import decide_agentic_pilot_action
                decision = decide_agentic_pilot_action(target, cumulative_insight)
                
                if decision.get('action') == 'execute':
                    cmd_str = decision.get('cmd', '')
                    base_tool = cmd_str.split(' ')[0].lower()
                    
                    if base_tool in WHITELIST:
                        update_db_logs(scan_id, f"[!] PILOT DECISION: AI has triggered follow-up action.\n[!] Reason: {decision.get('reason')}\n[!] Running: {cmd_str}\n", log_file, cur)
                        # We use shell=True safely here because we whitelist the base_tool
                        pilot_output = stream_tool(f"PILOT_{base_tool.upper()}", cmd_str.split(' '), scan_id, log_file, cur)
                        raw_logs += pilot_output
                        update_db_logs(scan_id, f"[+] PILOT Action Complete.\n", log_file, cur)
                    else:
                        update_db_logs(scan_id, f"[!] PILOT REJECTED: Suggested tool '{base_tool}' is not in safety whitelist.\n", log_file, cur)
                else:
                    update_db_logs(scan_id, f"[+] PILOT Reflection: No additional specialized follow-up needed.\n", log_file, cur)
            except Exception as e:
                print(f"[PILOT ERROR] {e}")
                update_db_logs(scan_id, f"[!] PILOT Error: {str(e)}\n", log_file, cur)

        # --- FINAL AI synthesis (Triggers on completion OR stop) ---
        if not is_stopped(scan_id, cur) or raw_logs.strip():
            try: cur.execute("UPDATE scans SET current_tool = 'Reporting' WHERE id = %s", (scan_id,))
            except: pass
            
            update_db_logs(scan_id, "\n[*] FINAL PHASE: AI REPORTING MODULE (Synthesizing findings...)\n", log_file, cur)
            
            # Generate report from whatever logs we collected
            ai_result = generate_ai_report(target, scan_type, raw_logs or "Audit logs collected so far.")
            ai_result['raw_logs'] = raw_logs
            
            report_json = json.dumps(ai_result)
            cur.execute("INSERT INTO reports (scan_id, report_json) VALUES (%s, %s) ON DUPLICATE KEY UPDATE report_json = VALUES(report_json)", (scan_id, report_json))
            
            if not is_stopped(scan_id, cur):
                cur.execute("UPDATE scans SET status = 'Completed', score = %s, risk = %s WHERE id = %s", (ai_result.get('security_score', 50), ai_result.get('overall_risk', 'Medium'), scan_id))
                update_db_logs(scan_id, "[+] SCAN COMPLETE. AUDIT CLOSED.\n", log_file, cur)
            else:
                cur.execute("UPDATE scans SET status = 'Failed', score = %s, risk = %s WHERE id = %s", (ai_result.get('security_score', 50), ai_result.get('overall_risk', 'Medium'), scan_id))
                update_db_logs(scan_id, "[!] SCAN STOPPED. PARTIAL AUDIT SAVED.\n", log_file, cur)
        else:
            # No logs at all
            cur.execute("UPDATE scans SET status = 'Failed' WHERE id = %s", (scan_id,))
            update_db_logs(scan_id, "\n[!] SCAN STOPPED BEFORE DATA COLLECTION.\n", log_file, cur)

    except Exception as e:
        print(f"[WORKER ERROR] {e}")
        try:
            cur.execute("UPDATE scans SET status = 'Failed' WHERE id = %s", (scan_id,))
        except: pass
    finally:
        conn.close()

# ── ROUTES ────────────────────────────────────────────────────────────────────

@scan_bp.route('/active', methods=['GET'])
@require_auth
def get_active_scan():
    """Returns the ID of the user's currently running scan if it exists."""
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB busy'}), 503
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id FROM scans WHERE user_id = %s AND status IN ('Pending', 'Running') ORDER BY created_at DESC LIMIT 1", (g.user_id,))
        res = cur.fetchone()
        return jsonify(res), 200
    finally:
        conn.close()

@scan_bp.route('/findings', methods=['GET'])
@require_auth
def list_findings():
    """Dynamically extracts findings from AI reports for the Threat Feed."""
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB busy'}), 503
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute('SELECT s.target_url, s.created_at, r.report_json FROM scans s JOIN reports r ON s.id = r.scan_id WHERE s.user_id = %s ORDER BY s.created_at DESC', (g.user_id,))
        scans = cur.fetchall()
        all_findings = []
        for s in scans:
            try:
                data = json.loads(s['report_json'])
                findings = data.get('findings_summary', [])
                for f in findings:
                    f['target_url'] = s['target_url']
                    f['scan_date'] = s['created_at']
                    all_findings.append(f)
            except: continue
        return jsonify(all_findings), 200
    finally:
        conn.close()

@scan_bp.route('/<int:scan_id>/stop', methods=['POST'])
@require_auth
def stop_scan(scan_id):
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB busy'}), 503
    cur = conn.cursor()
    try:
        conn.autocommit = True
        cur.execute("UPDATE scans SET status = 'Stopping' WHERE id = %s AND user_id = %s", (scan_id, g.user_id))
        if cur.rowcount == 0:
            return jsonify({'error': 'Not found or unauthorized'}), 404
        return jsonify({'ok': True}), 200
    finally:
        conn.close()

@scan_bp.route('/start', methods=['POST'])
@require_auth
def start_scan():
    data = request.get_json(silent=True) or {}
    target = data.get('target_url', 'google.com').replace('http://','').replace('https://','').split('/')[0]
    stype = data.get('scan_type', 'Quick')

    # Security: Block parameter injection and invalid chars
    if not re.match(r'^[a-zA-Z0-9.-]+$', target) or target.startswith('-'):
        return jsonify({'error': 'Invalid target format. No special characters or leading hyphens.'}), 400

    # Security: 30-second rate limiting per user
    now = time.time()
    last_val = _last_scan.get(g.user_id, 0)
    if now - last_val < 30:
        return jsonify({'error': 'Rate Limit Exceeded. Please wait 30 seconds between scans.'}), 429
    _last_scan[g.user_id] = now
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB busy'}), 503
    cur = conn.cursor(dictionary=True)
    try:
        # Check for active scans
        cur.execute("SELECT id FROM scans WHERE user_id = %s AND status IN ('Pending', 'Running') LIMIT 1", (g.user_id,))
        active = cur.fetchone()
        if active:
            return jsonify({'error': f'A scan is already active. Reconnect to Scan #{active["id"]}', 'active_id': active['id']}), 400

        cur.execute("INSERT INTO scans (user_id, target_url, scan_type, status) VALUES (%s, %s, %s, 'Pending')", (g.user_id, target, stype))
        conn.commit()
        scan_id = cur.lastrowid
        threading.Thread(target=_scan_worker, args=(scan_id, target, stype, g.user_id, data.get('custom_params')), daemon=True).start()
        return jsonify({'scan_id': scan_id}), 202
    finally:
        conn.close()

@scan_bp.route('/', methods=['GET'])
@require_auth
def list_scans():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB busy'}), 503
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute('SELECT * FROM scans WHERE user_id = %s ORDER BY created_at DESC', (g.user_id,))
        res = cur.fetchall()
        return jsonify(res), 200
    finally:
        conn.close()

@scan_bp.route('/<int:scan_id>', methods=['GET'])
@require_auth
def get_scan(scan_id):
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB busy'}), 503
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute('SELECT s.*, r.report_json FROM scans s LEFT JOIN reports r ON s.id = r.scan_id WHERE s.id = %s AND s.user_id = %s', (scan_id, g.user_id))
        res = cur.fetchone()
        if not res:
            return jsonify({'error': 'Scan not found'}), 404
        return jsonify(res), 200
    finally:
        conn.close()
