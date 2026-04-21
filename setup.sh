#!/bin/bash

# ReconX AI — Universal One-Tap Linux Setup
# Designed for Parrot OS, Kali Linux, and Ubuntu/Debian Servers.

echo -e "\e[1;36m"
echo "  _____                             __   __                _____     "
echo " |  __ \                           \ \ / /               / ____|    "
echo " | |__) |___  ___ ___  _ __  __  __\ V /    /\   |_ _|  | (___      "
echo " |  _  // _ \/ __/ _ \| '_ \ \ \/ / > <    /  \   | |    \___ \     "
echo " | | \ \  __/ (_| (_) | | | | >  < / . \  / /\ \ _| |_   ____) |    "
echo " |_|  \_\___|\___\___/|_| |_|/_/\_/_/ \_\/_/  \_\_____| |_____/     "
echo "                                                                    "
echo "                MISSION: FULL-PROOF HACKING MODE                     "
echo -e "\e[0m"

# --- 1. Environment Check ---
if [[ $EUID -ne 0 ]]; then
   echo -e "\e[1;31m[!] This script must be run as root or with sudo.\e[0m" 
   exit 1
fi

echo -e "\e[1;32m[*] Initializing Environment... \e[0m"

# Detect OS
if [ -f /etc/debian_version ]; then
    PKGMGR="apt-get"
else
    echo -e "\e[1;31m[!] Non-Debian based OS detected. Attempting to proceed with apt-get anyway...\e[0m"
    PKGMGR="apt-get"
fi

# --- 2. System Updates & Core Tools ---
echo -e "\e[1;34m[*] Updating System Repositories... \e[0m"
$PKGMGR update -y

echo -e "\e[1;34m[*] Installing Core Dependencies (Git, Python, Curl)... \e[0m"
$PKGMGR install -y python3-pip python3-venv git curl wget build-essential

# --- 3. Professional Hacking Suite ---
echo -e "\e[1;34m[*] Installing Hacking Suite (Nmap, SQLMap, Nuclei, Subfinder, etc.)... \e[0m"
$PKGMGR install -y nmap sqlmap slowhttptest whois nikto gobuster zaproxy

# Install Nuclei & Subfinder if not available via apt (for older repos)
if ! command -v nuclei &> /dev/null; then
    echo "[*] Nuclei not in repos. Installing via go..."
    $PKGMGR install -y golang-go
    export GOPATH=$HOME/go
    export PATH=$PATH:$GOPATH/bin
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
fi

# --- 4. Python Backend Dependencies ---
echo -e "\e[1;34m[*] Configuring Python Environment... \e[0m"
if [ -f "backend/requirements.txt" ]; then
    pip3 install -r backend/requirements.txt --break-system-packages
else
    echo -e "\e[1;33m[!] backend/requirements.txt not found. Installing defaults...\e[0m"
    pip3 install flask flask-cors flask-bcrypt pyjwt mysql-connector-python python-dotenv openai requests python-whois gunicorn google-generativeai groq langchain-core langchain-google-genai langgraph --break-system-packages
fi

# Additional modules for ZAP and XSStrike
pip3 install zaproxy tld fuzzywuzzy --break-system-packages

# --- 5. XSStrike Installation ---
echo -e "\e[1;34m[*] Deploying XSStrike (Advanced reflection engine)... \e[0m"
INSTALL_DIR="/opt/ReconX_Tools"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

if [ ! -d "XSStrike" ]; then
    git clone https://github.com/s0md3v/XSStrike.git
fi
cd XSStrike
pip3 install -r requirements.txt --break-system-packages
ln -sf $(pwd)/xsstrike.py /usr/local/bin/xsstrike
chmod +x /usr/local/bin/xsstrike

# --- 6. OWASP ZAP Automation Scripts ---
echo -e "\e[1;34m[*] Fetching ZAP Automation Pipeline... \e[0m"
curl -L https://raw.githubusercontent.com/zaproxy/zaproxy/main/docker/zap-baseline.py -o /usr/local/bin/zap-baseline.py
curl -L https://raw.githubusercontent.com/zaproxy/zaproxy/main/docker/zap_common.py -o /usr/local/bin/zap_common.py
chmod +x /usr/local/bin/zap-baseline.py
chmod +x /usr/local/bin/zap_common.py

# --- Finalization ---
echo -e "\n\e[1;32m[+] SETUP COMPLETE: MISSION READY!\e[0m"
echo -e "\e[1;36m--------------------------------------------------------\e[0m"
echo -e " All professional tools are now linked globally:"
echo -e "   - xsstrike --help"
echo -e "   - zap-baseline.py --help"
echo -e "   - nuclei --version"
echo -e "   - subfinder --version"
echo -e "   - slowhttptest -h"
echo -e "   - nmap --version"
echo -e "   - sqlmap --version"
echo -e "\e[1;36m--------------------------------------------------------\e[0m"
echo -e "\e[1;33m[*] Next Steps:\e[0m"
echo -e " 1. Configure your .env in the backend folder."
echo -e " 2. Run 'python3 backend/app.py' to start the engine."
echo -e "\e[1;36m--------------------------------------------------------\e[0m\n"
