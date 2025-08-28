#!/bin/bash

# Setup script for WebRTC UDP-like Speed Test

echo "Setting up WebRTC UDP-like Speed Test..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

echo "Python 3 found: $(python3 --version)"

# Install Python dependencies
echo "Installing Python dependencies..."
cd server
python3 -m pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "Dependencies installed successfully!"
    echo ""
    echo "To start the WebRTC Speed Test server:"
    echo "  cd server"
    echo "  python3 webrtc-server.py"
    echo ""
    echo "Then open http://localhost:8080 in your browser"
    echo ""
    echo "Features:"
    echo "- WebRTC DataChannels for UDP-like testing"
    echo "- Automatic fallback to HTTP testing if WebRTC unavailable"
    echo "- Real-time latency, download, and upload measurements"
else
    echo "Error installing dependencies. Please check your Python installation."
    exit 1
fi
