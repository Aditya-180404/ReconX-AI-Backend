
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from core.database import get_db_connection

try:
    conn = get_db_connection()
    if not conn:
        print("[FATAL] Could not connect to database.")
        sys.exit(1)
        
    cur = conn.cursor()
    print("[*] Starting database migration...")
    
    # 1. Add raw_output column
    try:
        cur.execute("ALTER TABLE scans ADD COLUMN ai_insight TEXT AFTER raw_output;")
        print("[+] Added ai_insight column.")
    except Exception as e:
        print(f"[!] Info: {e}")

    try:
        cur.execute("ALTER TABLE scans ADD COLUMN current_tool VARCHAR(100) AFTER ai_insight;")
        print("[+] Added current_tool column.")
    except Exception as e:
        print(f"[!] Info: {e}")

    try:
        cur.execute("ALTER TABLE scans MODIFY COLUMN status ENUM('Pending','Running','Completed','Failed','Stopping') DEFAULT 'Pending';")
        print("[+] Updated scans.status ENUM.")
    except Exception as e:
        print(f"[!] Error updating status ENUM: {e}")

    try:
        cur.execute("ALTER TABLE scans MODIFY COLUMN scan_type ENUM('Quick','Deep','Phishing','Custom') DEFAULT 'Quick';")
        print("[+] Updated scans.scan_type ENUM.")
    except Exception as e:
        print(f"[!] Error updating scan_type ENUM: {e}")

    conn.commit()
    conn.close()
    print("[*] Migration complete.")

except Exception as e:
    print(f"[FATAL] Migration failed: {e}")
