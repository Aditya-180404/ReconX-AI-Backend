#!/bin/bash

# ReconX AI — Autonomous Deployment Script for Parrot OS
# ──────────────────────────────────────────────────────

# ANSI Colors for terminal output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "    ____                      _  __   ___    ___ "
echo "   / __ \___  _________  ____| |/ /  /   |  /  _/"
echo "  / /_/ / _ \/ ___/ __ \/ __ \   /  / /| |  / /  "
echo " / _, _/  __/ /__/ /_/ / / / /   | / ___ |_/ /   "
echo "/_/ |_|\___/\___/\____/_/ /_/_/|_|/_/  |_/___/   "
echo -e "${NC}"
echo -e "${GREEN}[*] Initiating Autonomous Deployment Sequence for Parrot OS...${NC}"

# 1. Update System
echo -e "${CYAN}[1/6] Updating APT repositories...${NC}"
sudo apt update -y

# 2. Install Core CLI Hacking Tools
echo -e "${CYAN}[2/6] Installing Core Security Toolchain & Tunneling...${NC}"
sudo apt install -y nmap nikto sqlmap xterm python3-pip mariadb-server mariadb-client curl wget golang-go pkill

# Install Ngrok
if ! command -v ngrok &> /dev/null; then
    echo -e "${CYAN}[*] Installing Ngrok...${NC}"
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/trusted.gpg.d/ngrok.list && sudo apt update && sudo apt install ngrok
else
    echo -e "${GREEN}[+] Ngrok already installed.${NC}"
fi

# Install Nuclei
if ! command -v nuclei &> /dev/null; then
    echo -e "${CYAN}[*] Installing Nuclei Engine...${NC}"
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
    sudo cp ~/go/bin/nuclei /usr/local/bin/
else
    echo -e "${GREEN}[+] Nuclei already installed.${NC}"
fi

# 3. Setup Python Virtual Environment & Requirements
echo -e "${CYAN}[3/6] Configuring Python Environment...${NC}"
pip3 install -r requirements.txt --break-system-packages # Use --break-system-packages on Parrot/Debian if not in venv

# 4. Database Initialization
echo -e "${CYAN}[4/6] Initializing MariaDB (ReconX DB)...${NC}"
sudo service mariadb start

# Create DB, User and grant permissions
# Note: This assumes default root user has no password on local dev
sudo mysql -e "CREATE DATABASE IF NOT EXISTS reconx_db;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'reconx_user'@'localhost' IDENTIFIED BY 'reconx_pass';"
sudo mysql -e "GRANT ALL PRIVILEGES ON reconx_db.* TO 'reconx_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Apply Schema
if [ -f "database/schema.sql" ]; then
    echo -e "${CYAN}[*] Applying Database Schema...${NC}"
    sudo mysql reconx_db < database/schema.sql
    # Apply latest scan_type sync
    sudo mysql -e "ALTER TABLE reconx_db.scans MODIFY COLUMN scan_type ENUM('Quick','Deep','Phishing','Custom') DEFAULT 'Quick';"
else
    echo -e "${RED}[!] schema.sql not found in backend/database/schema.sql${NC}"
fi

# 5. Permissioning
echo -e "${CYAN}[5/6] Setting Directory Permissions...${NC}"
mkdir -p uploads
chmod 777 uploads

# 6. Final Check
echo -e "${CYAN}[6/6] Finalizing Setup...${NC}"
echo -e "${GREEN}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}[SUCCESS] ReconX AI Deployment Complete!${NC}"
echo -e "${CYAN}To start the backend engine:${NC}"
echo -e "   cd backend && python3 app.py"
echo -e "${CYAN}Then, in another terminal, start your React frontend.${NC}"
echo -e "${GREEN}─────────────────────────────────────────────────────────────────${NC}"
