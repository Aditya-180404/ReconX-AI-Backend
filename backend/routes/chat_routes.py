"""
chat_routes.py — /api/chat/*
Handles persistent multi-turn chat with the ReconX Copilot.
"""
from flask import Blueprint, request, jsonify, g
from core.database import get_db_connection
from core.auth import require_auth
from core.ai_engine import ask_copilot
from core.agent_engine import reconx_agent
from langchain_core.messages import HumanMessage, AIMessage

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route('/history', methods=['GET'])
@require_auth
def get_history():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT role, content, created_at FROM chat_history WHERE user_id = %s ORDER BY created_at ASC",
            (g.user_id,)
        )
        return jsonify(cur.fetchall()), 200
    finally:
        conn.close()

@chat_bp.route('/send', methods=['POST'])
@require_auth
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'Message content is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 503
    try:
        cur = conn.cursor(dictionary=True)
        
        # 1. Save User Message
        cur.execute(
            "INSERT INTO chat_history (user_id, role, content) VALUES (%s, 'user', %s)",
            (g.user_id, message)
        )
        conn.commit()

        # 2. Fetch History & Convert to LangChain Messages
        cur.execute(
            "SELECT role, content FROM chat_history WHERE user_id = %s ORDER BY created_at DESC LIMIT 10",
            (g.user_id,)
        )
        db_history = list(reversed(cur.fetchall()))
        
        lc_history = []
        for m in db_history:
            if m['role'] == 'user':
                lc_history.append(HumanMessage(content=m['content']))
            else:
                lc_history.append(AIMessage(content=m['content']))

        # 3. Invoke LangGraph Agent (with built-in failover and strict timeout)
        try:
            from core.agent_engine import run_reconx_agent
            
            # We use a 45-second "soft" timeout here to stay well below the 60s frontend timeout.
            # This is a bulletproof demo safety net.
            ai_response = run_reconx_agent(lc_history, g.user_id)
            
            # Additional heuristic enhancement if agent was throttled
            if "[NEURAL_FALLBACK_TRIGGERED]" in ai_response:
                cur.execute(
                    "SELECT target_url, score, risk FROM scans WHERE user_id = %s AND status = 'Completed' ORDER BY created_at DESC LIMIT 50",
                    (g.user_id,)
                )
                scans = cur.fetchall()
                ctx = "\n".join([f"Scan #{i+1}: {s['target_url']} | Score: {s['score']} | Risk: {s['risk']}" for i, s in enumerate(scans)])
                from core.ai_engine import _heuristic_chat_response
                ai_response = _heuristic_chat_response(message, ctx)

        except Exception as e:
            err_msg = str(e)
            print(f"[Agent Warning] {err_msg}")
            
            # Final Safety Net: Trigger Heuristic if anything takes too long or fails
            cur.execute(
                "SELECT target_url, score, risk FROM scans WHERE user_id = %s AND status = 'Completed' ORDER BY created_at DESC LIMIT 10",
                (g.user_id,)
            )
            scans = cur.fetchall()
            ctx = "\n".join([f"Scan #{i+1}: {s['target_url']} | Score: {s['score']} | Risk: {s['risk']}" for i, s in enumerate(scans)])
            from core.ai_engine import _heuristic_chat_response
            ai_response = _heuristic_chat_response(message, ctx)

        # 4. Save Assistant Response
        cur.execute(
            "INSERT INTO chat_history (user_id, role, content) VALUES (%s, 'assistant', %s)",
            (g.user_id, ai_response)
        )
        conn.commit()

        return jsonify({'response': ai_response}), 200
    finally:
        conn.close()
