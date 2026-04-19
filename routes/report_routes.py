"""
report_routes.py — /api/reports/*
"""
from flask import Blueprint, jsonify, g
from core.database import get_db_connection
from core.auth import require_auth

report_bp = Blueprint('report_bp', __name__)


@report_bp.route('/', methods=['GET'])
@require_auth
def list_reports():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            '''SELECT s.id as scan_id, s.target_url, s.score, s.risk, s.scan_type, s.status, s.created_at,
                      r.id as report_id, r.pdf_path, r.report_json
               FROM scans s
               LEFT JOIN reports r ON s.id = r.scan_id
               WHERE s.user_id = %s
               ORDER BY s.created_at DESC''',
            (g.user_id,)
        )
        return jsonify(cur.fetchall()), 200
    finally:
        conn.close()


@report_bp.route('/<int:report_id>', methods=['GET'])
@require_auth
def get_report(report_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            '''SELECT r.*, s.target_url, s.score, s.risk, s.scan_type
               FROM reports r JOIN scans s ON s.id = r.scan_id
               WHERE r.id = %s AND s.user_id = %s''',
            (report_id, g.user_id)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Report not found'}), 404
        return jsonify(row), 200
    finally:
        conn.close()
