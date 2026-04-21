import sys
import os
from datetime import datetime

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import get_db_connection

def get_last_scan(user_id):
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return
    try:
        cur = conn.cursor(dictionary=True)
        query = "SELECT * FROM scans WHERE user_id = %s ORDER BY created_at DESC LIMIT 1"
        cur.execute(query, (user_id,))
        scan = cur.fetchone()
        
        if not scan:
            print(f"No scans found for user_id {user_id}.")
            return

        print(f"--- Last Scan for User {user_id} ---")
        print(f"ID: {scan['scan_id']}")
        print(f"Target: {scan['target_url']}")
        print(f"Type: {scan['scan_type']}")
        print(f"Status: {scan['status']}")
        print(f"Risk: {scan['risk']}")
        print(f"Score: {scan['score']}")
        print(f"Created: {scan['created_at']}")
        print("-" * 30)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    uid = 3
    get_last_scan(uid)
