"""
database.py — MySQL connection helper
Reads credentials from the root .env file.
"""
import os
import mysql.connector
from dotenv import load_dotenv

# Load from the project root .env (two levels up from this file)
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
load_dotenv(os.path.join(_root, '.env'))

def get_db_connection():
    """Return a live mysql.connector connection or None on failure."""
    try:
        return mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'reconx_db'),
            autocommit=False,
            connection_timeout=10,
        )
    except mysql.connector.Error as e:
        print(f"[DB] Connection error: {e}")
        return None
