# SpeedTest Multi-Protocol Implementation

This project extends OpenSpeedTest to support **three network testing protocols**: True UDP (server-side), WebRTC DataChannels (UDP-like in browsers), and classic HTTP (TCP). It enables accurate, real-world comparison of network performance across all major web-accessible transport layers.

---

## Overview

**Why Multi-Protocol?**
- **True UDP:** For the most accurate measurement of packet loss, latency, and throughput, using native UDP sockets on the backend.
- **WebRTC DataChannels:** Closest possible UDP-like experience in browsers, using SCTP over DTLS/UDP.
- **HTTP (TCP):** Universal compatibility and a reliable baseline for comparison.

**How does it work?**
- The web interface lets you select which protocol to test, or compare all three side-by-side.
- UDP tests use a backend bridge to overcome browser security restrictions.
- WebRTC tests use peer-to-peer DataChannels for UDP-like behavior.
- HTTP tests use standard XMLHttpRequest for TCP-based measurement.

---

## Features

- **True UDP Testing:** Real UDP sockets on the server for download, upload, and ping.
- **WebRTC UDP-like Testing:** Unreliable, unordered DataChannels for browser-native UDP-like tests.
- **HTTP Testing:** Classic TCP-based speed test for universal compatibility.
- **Protocol Comparison:** Run all tests and compare results in a single UI.
- **Automatic Protocol Selection:** Uses the best available protocol for your environment.
- **Low Latency Measurement:** Both UDP and WebRTC provide lower latency than TCP.
- **Real-time Performance:** Live metrics for latency, jitter, download, and upload.
- **Fallback Support:** If a protocol is unavailable, the test falls back to the next best option.

---

## Architecture

### Components

1. **UDP Speed Test Server** (`server/udp-server.py`)
   - Native UDP socket server for true UDP tests
   - Handles ping, download, and upload
   - WebSocket control interface for coordination

2. **HTTP-UDP Bridge** (`server/http-udp-bridge.py`)
   - Bridges HTTP requests from browsers to the UDP server
   - Enables browser-based UDP testing via SSE and POST

3. **WebRTC Speed Test Engine** (`assets/js/webrtc-speed-test.js`)
   - Implements UDP-like DataChannel tests in the browser
   - Peer connection setup and data transfer

4. **UDP Client Interface** (`assets/js/udp-speed-test.js`)
   - Orchestrates UDP tests from the browser via the bridge

5. **Multi-Protocol Integration** (`assets/js/multi-protocol-test.js`)
   - Unified UI for protocol selection and comparison
   - Runs all tests and displays results

6. **WebRTC Integration Layer** (`assets/js/webrtc-integration.js`)
   - Integrates WebRTC with the OpenSpeedTest UI

7. **WebRTC Signaling Server** (`server/webrtc-server.py`)
   - WebSocket signaling for WebRTC peer connection

---

## Installation & Usage

### Prerequisites
- Python 3.7+ (with `websockets` library)
- Modern web browser (Chrome, Firefox, Safari, Edge) for WebRTC

### Quick Start

1. **Start all servers:**
   ```bash
   ./start-servers.sh
   ```
   This launches:
   - UDP Server (port 9001)
   - HTTP-UDP Bridge (port 8080)
   - WebRTC Signaling Server (port 8081)

2. **Or start servers individually:**
   ```bash
   pip3 install -r server/requirements.txt
   python3 server/udp-server.py --udp-port 9001 --ws-port 9002
   python3 server/http-udp-bridge.py --http-port 8080 --udp-port 9001
   python3 server/webrtc-server.py --http-port 8081 --ws-port 8082
   ```

3. **Open the speed test in your browser:**
   - Main interface: `http://localhost:8080`
   - WebRTC-only: `http://localhost:8081`

4. **Stop all servers:**
   ```bash
   ./stop-servers.sh
   ```

---

## How It Works

- **UDP:** Browser sends HTTP requests to the bridge, which relays them to the UDP server. Results are streamed back via SSE or HTTP responses.
- **WebRTC:** Browser establishes a DataChannel to the server or peer, sending/receiving test data directly over UDP-like SCTP.
- **HTTP:** Browser uses XMLHttpRequest to transfer data over TCP.
- **Comparison:** The UI displays latency, jitter, download, and upload for each protocol, highlighting differences.

---

## Technical Details

### WebRTC DataChannel Configuration
```js
{
  ordered: false,        // Unordered (UDP-like)
  maxRetransmits: 0,     // No retransmits (UDP-like)
  protocol: 'speed-test' // Custom identifier
}
```

### Protocol Stack
- **UDP:** Browser → HTTP Bridge → UDP Server
- **WebRTC:** Browser ↔ DataChannel ↔ Peer/Server
- **HTTP:** Browser → HTTP Server

---

## Supported Browsers
- Chrome 56+
- Firefox 52+
- Safari 11+
- Edge 79+

---

## Performance & Limitations

- **UDP:** Most accurate, but requires backend and bridge
- **WebRTC:** Closest browser-native UDP, but not true UDP
- **HTTP:** Reliable, but higher latency and not suitable for real-time UDP apps
- **Fallback:** If UDP/WebRTC unavailable, HTTP is always available

---

## Security
- **DTLS Encryption:** All WebRTC DataChannel traffic is encrypted
- **Origin Validation:** Signaling server checks origins
- **No Direct File Access:** All operations are in-memory

---

## Extending & Customizing
- Add new protocols by extending `multi-protocol-test.js`
- Modify server-side scripts for custom UDP logic
- UI is modular and can be themed or embedded

---

## License
MIT (same as OpenSpeedTest)

---

## Credits
- Based on OpenSpeedTest by openspeedtest
- Multi-protocol extensions by macclab-stevens

---

For questions or contributions, open an issue or pull request on GitHub!
