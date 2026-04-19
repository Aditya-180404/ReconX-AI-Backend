import os
import datetime
import jwt
from functools import wraps
from flask import request, jsonify

JWT_SECRET  = os.getenv('JWT_SECRET', 'CHANGE_ME_IN_PRODUCTION')
JWT_ALG     = 'HS256'
JWT_EXPIRES = 24  # hours

def create_token(user_id: int, role: str, username: str = "") -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'username': username,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

def require_auth(f):
    """Route decorator — validates Bearer JWT and injects `g.user_id` / `g.role`."""
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        token = auth.split(' ', 1)[1]
        try:
            payload = decode_token(token)
            g.user_id = payload['user_id']
            g.role    = payload['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    """Extends require_auth — also checks role == Admin."""
    @require_auth
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g
        if g.role != 'Admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated
