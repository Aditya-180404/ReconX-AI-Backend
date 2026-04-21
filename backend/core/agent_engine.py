import os
import json
from typing import Annotated, TypedDict, Union, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
import random
from core.database import get_db_connection

# ── Configuration ────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL   = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
GROQ_MODEL     = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')


# ── State Definition ─────────────────────────────────────────────────────────
class AgentState(TypedDict):
    """The state of the ReconX Agentic Graph."""
    messages: Annotated[List[BaseMessage], add_messages]
    user_id: int # To ensure data isolation

# ── Tools (Database Connection) ──────────────────────────────────────────────
@tool
def get_user_scan_history(user_id: int) -> str:
    """Fetch the latest 10 security scans for the current user including scores and risks."""
    conn = get_db_connection()
    if not conn: return "Database unavailable."
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            '''SELECT id, target_url, score, risk, created_at 
               FROM scans WHERE user_id = %s 
               ORDER BY created_at DESC LIMIT 10''',
            (user_id,)
        )
        rows = cur.fetchall()
        if not rows: return "No completed scans found for this user."
        
        output = "LATEST SCAN HISTORY:\n"
        for i, r in enumerate(rows):
            output += f"{i+1}. ScanID: {r['id']} | Target: {r['target_url']} | Score: {r['score']} | Risk: {r['risk']}\n"
        return output
    finally:
        conn.close()

@tool
def get_detailed_report(scan_id: int) -> str:
    """Fetch the full AI analysis and vulnerability findings for a specific scan ID."""
    conn = get_db_connection()
    if not conn: return "Database unavailable."
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT report_json FROM reports WHERE scan_id = %s",
            (scan_id,)
        )
        row = cur.fetchone()
        if not row: return f"No report found for ScanID {scan_id}."
        
        # Parse it nicely
        report = json.loads(row['report_json'])
        summary = report.get('executive_summary', 'No summary available.')
        findings = report.get('findings_summary', [])
        
        output = f"DETAILED ANALYSIS FOR SCAN {scan_id}:\n"
        output += f"Executive Summary: {summary}\n\n"
        output += "VULNERABILITIES:\n"
        for f in findings:
            output += f"- [{f.get('severity')}] {f.get('title')} at {f.get('endpoint')}\n"
            output += f"  Fix: {f.get('fix')}\n"
        return output
    finally:
        conn.close()

# ── Agent Logic ──────────────────────────────────────────────────────────────
tools = [get_user_scan_history, get_detailed_report]
tool_node = ToolNode(tools)

def _get_llm():
    """Returns a dynamically rotated Llama 3.1 (Groq) or Gemini fallback LLM"""
    from core.ai_engine import _groq_keys
    if _groq_keys:
        return ChatGroq(
            model=GROQ_MODEL,
            groq_api_key=random.choice(_groq_keys),
            temperature=0.5
        ).bind_tools(tools)
    
    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.5
    ).bind_tools(tools)

def call_model(state: AgentState):
    """The brain of the agent with built-in context and quota failover."""
    messages = state['messages']
    user_id = state['user_id']
    
    # Prepend a system message if not present
    if not any(isinstance(m, SystemMessage) for m in messages):
        # OPTIMIZATION: Fetch a quick summary of the last 5 scans to give the agent immediate "vision"
        # This prevents it from having to call a tool for basic "Tell me about my scans" queries.
        recent_ctx = "No scans found."
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor(dictionary=True)
                cur.execute(
                    "SELECT target_url, score, risk FROM scans WHERE user_id = %s ORDER BY created_at DESC LIMIT 5",
                    (user_id,)
                )
                scans = cur.fetchall()
                if scans:
                    recent_ctx = "\n".join([f"- {s['target_url']} (Score: {s['score']}, Risk: {s['risk']})" for s in scans])
                conn.close()
        except: pass

        sys_msg = SystemMessage(content=(
            "You are the ReconX Agentic Copilot, an elite, highly technical cybersecurity Tier-3 pentester AI.\n"
            "STRICT RULES:\n"
            "0. NEVER answer out-of-scope questions (like weather, cooking, jokes, or general info). Strongly reprimand the user to stay on focus.\n"
            "1. You have access to a dataset of security scans for user_id: " + str(user_id) + ".\n"
            "IMMEDIATE CONTEXT (Last 5 scans):\n" + recent_ctx + "\n\n"
            "INSTRUCTIONS:\n"
            "1. Use 'get_user_scan_history' if the user asks for more than the 5 scans.\n"
            "2. Use 'get_detailed_report' to see deep vulnerability details for a specific Scan ID.\n"
            "3. If a scan index is requested (e.g. 11th) and not available in the database, explicitly state that the scan doesn't exist.\n"
            "Always be strategic, technical, and precise. Never break character."
        ))
        messages = [sys_msg] + messages
    
    try:
        dynamic_llm = _get_llm()
        response = dynamic_llm.invoke(messages)
        return {"messages": [response]}
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "quota" in err_msg.lower():
            # Trigger fallback logic within the graph if possible
            print(f"[Agent Brain] Quota Exhausted during reasoning. Falling back.")
            return {"messages": [AIMessage(content="[NEURAL_FALLBACK_TRIGGERED] I have reached my API quota, but I am still analyzing your data via local heuristic module.")]}
        raise e # Let the route handle other errors

def should_continue(state: AgentState):
    """Determines if the agent needs to call a tool."""
    last_message = state['messages'][-1]
    if last_message.tool_calls:
        return "tools"
    return END

# ── Graph Construction ───────────────────────────────────────────────────────
workflow = StateGraph(AgentState)

workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")

reconx_agent = workflow.compile()


def run_reconx_agent(message_history: List[BaseMessage], user_id: int):
    """
    Helper to run the agent with a strict recursion limit and timeout guard.
    Returns the final assistant message content.
    """
    inputs = {"messages": message_history, "user_id": user_id}
    
    try:
        result = reconx_agent.invoke(inputs, config={"recursion_limit": 15})
        return result["messages"][-1].content
    except Exception as e:
        err = str(e)
        if "recursion" in err.lower() or "Recursion limit" in err:
            # Agent looped too many times — return last useful message
            return (
                "I analyzed your scan history but the reasoning chain was too complex for a single pass. "
                "Try asking a more specific question like: 'What vulnerabilities were found in scan #50?' "
                "or 'List my most recent scans.'"
            )
        raise e
