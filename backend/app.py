"""
app.py — ReconX AI Flask Application Entry Point
Run from the project root:
    cd backend
    python app.py
Or with Gunicorn:
    gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
"""
import os
import sys
import shutil

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

from core.database import get_db_connection

load_dotenv()

# ── Blueprints ────────────────────────────────────────────────────────────────
from routes.auth_routes   import auth_bp
from routes.scan_routes   import scan_bp
from routes.report_routes import report_bp
from routes.chat_routes   import chat_bp

def enforce_db_schema():
    """Self-healing migration logic for server-grade portability."""
    print("[*] Performing Auto-Migration check...")
    conn = get_db_connection()
    if not conn: return
    try:
        cur = conn.cursor()
        # Add missing columns to 'scans' table
        cols = [
            ("raw_output", "LONGTEXT"),
            ("ai_insight", "TEXT"),
            ("current_tool", "VARCHAR(100)")
        ]
        for col_name, col_type in cols:
            try:
                cur.execute(f"ALTER TABLE scans ADD COLUMN {col_name} {col_type};")
                print(f"[+] Migrated database: Added column '{col_name}'")
            except: pass # Column likely exists
            
        # Clean up zombie scans from previous server crashes
        cur.execute("UPDATE scans SET status = 'Failed', ai_insight = 'Scan aborted due to server shutdown/restart.' WHERE status IN ('Pending', 'Running', 'Stopping')")
        
        # Ensure chat_history table exists for the Agentic Copilot
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                role ENUM('user', 'assistant') NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_chat_user (user_id),
                CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        """)

        # Ensure 'logs' directory exists
        log_dir = os.path.join(os.getcwd(), 'logs')
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            print(f"[+] Initialized application log storage: {log_dir}")
        
        conn.commit()
    except Exception as e:
        print(f"[!] Migration Error: {e}")
    finally:
        conn.close()

def create_app() -> Flask:
    enforce_db_schema()
    app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
    
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    # ── Security headers ─────────────────────────────────────────────────────
    @app.after_request
    def set_security_headers(response):
        response.headers.update({
            'X-Content-Type-Options':  'nosniff',
            'X-Frame-Options':         'DENY',
            'X-XSS-Protection':        '1; mode=block',
            'Referrer-Policy':         'strict-origin-when-cross-origin',
            'Permissions-Policy':      'geolocation=(), microphone=()',
        })
        return response

    # ── CORS ─────────────────────────────────────────────────────────────────
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    CORS(app, resources={r'/api/*': {'origins': [o.strip() for o in allowed_origins]}},
         supports_credentials=True)

    # ── Extensions ────────────────────────────────────────────────────────────
    Bcrypt(app)

    # ── Register blueprints ───────────────────────────────────────────────────
    app.register_blueprint(auth_bp,   url_prefix='/api/auth')
    app.register_blueprint(scan_bp,   url_prefix='/api/scans')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(chat_bp,   url_prefix='/api/chat')

    # ── Health endpoint ───────────────────────────────────────────────────────
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status':  'healthy',
            'service': 'ReconX AI Engine',
            'version': '2.0.0',
        }), 200

    # ── Error handlers ────────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(_): 
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Endpoint not found'}), 404
        return send_from_directory(app.static_folder, 'index.html')

    @app.errorhandler(500)
    def server_error(e): return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500

    return app


# Create module-level app instance (used by Gunicorn)
app = create_app()

if __name__ == '__main__':
    port  = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    print(f"\n  [OK] ReconX AI Engine starting on http://0.0.0.0:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
