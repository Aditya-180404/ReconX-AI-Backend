#!/bin/bash

# start_exposed.sh — Launches ReconX Backend + Static Ngrok Tunnel
# ─────────────────────────────────────────────────────────────

# Load variables or prompt
# You can hardcode your domain here for speed during the hackathon
STATIC_DOMAIN="" 

if [ -z "$STATIC_DOMAIN" ]; then
    echo "Enter your ngrok static domain (e.g. your-name.ngrok-free.app):"
    read STATIC_DOMAIN
fi

echo "[*] Starting Flask Backend in background..."
python3 app.py > backend.log 2>&1 &
BACKEND_PID=$!

echo "[*] Launching Ngrok Tunnel: https://$STATIC_DOMAIN"
echo "[!] Press CTRL+C to stop both backend and tunnel."

# Start ngrok
ngrok http --url="$STATIC_DOMAIN" 5000

# Cleanup on exit
kill $BACKEND_PID
echo "[*] Backend and Tunnel stopped."
