"""
auth_routes.py — /api/auth/*
Handles register, login, and token refresh.
"""
from flask import Blueprint, request, jsonify, g
from flask_bcrypt import Bcrypt
from core.database import get_db_connection
from core.auth import create_token, require_auth

auth_bp = Blueprint('auth_bp', __name__)
bcrypt  = Bcrypt()

# ── Login throttling (in-memory, per-process) ────────────────────────────────
_failed: dict[str, int] = {}
MAX_ATTEMPTS = 5

# ── Register ─────────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    email    = (data.get('email')    or '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'username, email and password are required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    pwd_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)',
            (username, email, pwd_hash)
        )
        conn.commit()
        # Auto-log the action
        user_id = cur.lastrowid
        cur.execute('INSERT INTO logs (user_id, action) VALUES (%s, %s)', (user_id, 'REGISTER'))
        conn.commit()
        return jsonify({'message': 'Account created successfully'}), 201
    except Exception as e:
        msg = str(e)
        if 'Duplicate' in msg:
            return jsonify({'error': 'Email or username already registered'}), 409
        return jsonify({'error': msg}), 400
    finally:
        conn.close()


# ── Login ─────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    # Throttle check
    if _failed.get(email, 0) >= MAX_ATTEMPTS:
        return jsonify({'error': 'Account locked — too many failed attempts. Contact support.'}), 429

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cur.fetchone()

        if not user or not bcrypt.check_password_hash(user['password_hash'], password):
            _failed[email] = _failed.get(email, 0) + 1
            return jsonify({'error': 'Invalid email or password'}), 401

        # Reset failed counter on success
        _failed.pop(email, None)

        token = create_token(user['id'], user['role'], user['username'])
        cur.execute('INSERT INTO logs (user_id, action) VALUES (%s, %s)', (user['id'], 'LOGIN'))
        conn.commit()

        return jsonify({
            'token': token,
            'user':  {'id': user['id'], 'username': user['username'], 'role': user['role']},
        }), 200
    finally:
        conn.close()


# ── Me (profile) ─────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT id, username, email, role, created_at FROM users WHERE id = %s', (g.user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user), 200
    finally:
        conn.close()


# ── Update Profile ───────────────────────────────────────────────────────────
@auth_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    data     = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    email    = (data.get('email')    or '').strip().lower()

    if not username or not email:
        return jsonify({'error': 'Username and email are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor()
        cur.execute(
            'UPDATE users SET username = %s, email = %s WHERE id = %s',
            (username, email, g.user_id)
        )
        conn.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        if 'Duplicate' in str(e):
            return jsonify({'error': 'Username or email already in use'}), 409
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()


# ── Change Password ──────────────────────────────────────────────────────────
@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    data = request.get_json(silent=True) or {}
    old_pwd = data.get('currentPassword', '')
    new_pwd = data.get('newPassword', '')

    if not old_pwd or not new_pwd:
        return jsonify({'error': 'Current and new passwords are required'}), 400
    if len(new_pwd) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT password_hash FROM users WHERE id = %s', (g.user_id,))
        user = cur.fetchone()

        if not user or not bcrypt.check_password_hash(user['password_hash'], old_pwd):
            return jsonify({'error': 'Current password is incorrect'}), 401

        new_hash = bcrypt.generate_password_hash(new_pwd).decode('utf-8')
        cur.execute('UPDATE users SET password_hash = %s WHERE id = %s', (new_hash, g.user_id))
        cur.execute('INSERT INTO logs (user_id, action) VALUES (%s, %s)', (g.user_id, 'PASSWORD_CHANGE'))
        conn.commit()
        return jsonify({'message': 'Password updated successfully'}), 200
    finally:
        conn.close()
