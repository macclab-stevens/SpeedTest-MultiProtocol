#!/bin/bash

# Multi-Protocol Speed Test Server Startup Script
# Starts all required servers for UDP, WebRTC, and HTTP testing

echo "Multi-Protocol Speed Test Server Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start a server in background
start_server() {
    local name=$1
    local command=$2
    local port=$3
    local log_file=$4
    
    echo -e "${YELLOW}Starting $name on port $port...${NC}"
    
    if check_port $port; then
        echo -e "${RED}Warning: Port $port is already in use${NC}"
        return 1
    fi
    
    nohup $command > "$log_file" 2>&1 &
    local pid=$!
    
    # Wait a moment and check if the process is still running
    sleep 2
    if ps -p $pid > /dev/null; then
        echo -e "${GREEN}✓ $name started successfully (PID: $pid)${NC}"
        echo $pid > "${name,,}.pid"
        return 0
    else
        echo -e "${RED}✗ Failed to start $name${NC}"
        return 1
    fi
}

# Create logs directory
mkdir -p logs

echo "Checking Python dependencies..."
python3 -c "import websockets" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    python3 -m pip install -r server/requirements.txt
fi

echo ""
echo "Starting servers..."

# Start UDP Server
start_server "UDP-Server" "python3 server/udp-server.py --udp-port 9001 --ws-port 9002" 9001 "logs/udp-server.log"

# Start HTTP-UDP Bridge
start_server "HTTP-Bridge" "python3 server/http-udp-bridge.py --http-port 8080 --udp-port 9001" 8080 "logs/http-bridge.log"

# Start WebRTC Signaling Server  
start_server "WebRTC-Server" "python3 server/webrtc-server.py --http-port 8081 --ws-port 8082" 8081 "logs/webrtc-server.log"

echo ""
echo -e "${GREEN}Multi-Protocol Speed Test Setup Complete!${NC}"
echo ""
echo "Available Services:"
echo "  • Main Speed Test:     http://localhost:8080"
echo "  • WebRTC Alternative:  http://localhost:8081" 
echo "  • UDP Server:          localhost:9001"
echo "  • Control WebSocket:   ws://localhost:9002"
echo ""
echo "Supported Protocols:"
echo "  • UDP (True UDP via bridge)"
echo "  • WebRTC (SCTP over UDP)"
echo "  • HTTP (Original TCP)"
echo ""
echo "Log files:"
echo "  • UDP Server:     logs/udp-server.log"
echo "  • HTTP Bridge:    logs/http-bridge.log"
echo "  • WebRTC Server:  logs/webrtc-server.log"
echo ""
echo "To stop all servers: ./stop-servers.sh"
echo "To view logs: tail -f logs/*.log"
echo ""
echo -e "${YELLOW}Open http://localhost:8080 in your browser to start testing!${NC}"
