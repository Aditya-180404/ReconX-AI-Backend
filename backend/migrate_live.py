import os
import sys

# Ensure we can import from the backend/core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import get_db_connection

def migrate():
    conn = get_db_connection()
    if not conn:
        print("[!] Could not connect to database.")
        return
    
    try:
        cur = conn.cursor()
        print("[*] Adding 'ai_insight' and 'current_tool' to 'scans' table...")
        cur.execute("ALTER TABLE scans ADD COLUMN ai_insight TEXT DEFAULT NULL, ADD COLUMN current_tool VARCHAR(64) DEFAULT NULL")
        conn.commit()
        print("[+] Migration successful.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("[*] Columns already exist. Skipping.")
        else:
            print(f"[!] Migration error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
