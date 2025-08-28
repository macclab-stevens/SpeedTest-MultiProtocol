#!/bin/bash

# Stop all Multi-Protocol Speed Test servers

echo "Stopping Multi-Protocol Speed Test Servers..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop a server by PID file
stop_server() {
    local name=$1
    local pid_file="${name,,}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null; then
            echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
            kill $pid
            sleep 2
            
            # Force kill if still running
            if ps -p $pid > /dev/null; then
                echo -e "${RED}Force stopping $name...${NC}"
                kill -9 $pid
            fi
            
            echo -e "${GREEN}✓ $name stopped${NC}"
        else
            echo -e "${YELLOW}$name was not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}No PID file found for $name${NC}"
    fi
}

# Stop all servers
stop_server "UDP-Server"
stop_server "HTTP-Bridge" 
stop_server "WebRTC-Server"

# Also kill any Python processes running our servers (fallback)
echo -e "${YELLOW}Cleaning up any remaining server processes...${NC}"
pkill -f "udp-server.py" 2>/dev/null
pkill -f "http-udp-bridge.py" 2>/dev/null
pkill -f "webrtc-server.py" 2>/dev/null

echo -e "${GREEN}All servers stopped.${NC}"
