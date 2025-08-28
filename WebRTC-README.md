# Multi-Protocol Speed Test Implementation

This implementation adds both WebRTC DataChannel-based speed testing and server-side UDP testing to the OpenSpeedTest application, providing comprehensive UDP-like network performance testing capabilities in web browsers.

## Overview

This enhanced version supports three different protocols for network testing:

1. **True UDP Testing**: Server-side UDP with HTTP bridge for web browser access
2. **WebRTC DataChannels**: SCTP over DTLS/UDP for UDP-like behavior in browsers  
3. **HTTP Testing**: Original TCP-based testing (fallback)

Due to browser security restrictions, direct UDP socket access is not available from JavaScript. This implementation provides both the closest browser-based approximation (WebRTC) and true UDP testing via a server-side bridge.

## Features

- **True UDP Protocol**: Real UDP testing via server-side implementation
- **WebRTC UDP-like Protocol**: Uses unreliable, unordered WebRTC DataChannels
- **Protocol Comparison**: Test all protocols and compare results
- **Automatic Protocol Selection**: Chooses best available protocol
- **Low Latency Testing**: Both UDP and SCTP over UDP provide lower latency than TCP
- **Real-time Performance**: Direct peer-to-peer and server communication
- **Fallback Support**: Automatically falls back through protocols if unavailable

## Architecture

### Components

1. **UDP Speed Test Server** (`server/udp-server.py`)
   - True UDP server implementation
   - Handles UDP packets for ping, download, and upload testing
   - WebSocket control interface for coordination
   - Real UDP socket communication

2. **HTTP-UDP Bridge** (`server/http-udp-bridge.py`)
   - Bridges HTTP requests from browsers to UDP server
   - Enables web browsers to perform UDP testing
   - Server-Sent Events for download testing
   - HTTP POST for upload testing

3. **WebRTC Speed Test Engine** (`assets/js/webrtc-speed-test.js`)
   - Core WebRTC DataChannel implementation
   - Handles peer connection establishment
   - Manages speed test data transmission
   - Measures latency and throughput

4. **UDP Client Interface** (`assets/js/udp-speed-test.js`)
   - Client-side UDP testing interface
   - Communicates with HTTP-UDP bridge
   - Provides UDP test orchestration

5. **Multi-Protocol Integration** (`assets/js/multi-protocol-test.js`)
   - Integrates all testing protocols
   - Protocol selection and comparison
   - Unified testing interface

6. **WebRTC Integration Layer** (`assets/js/webrtc-integration.js`)
   - Integrates WebRTC testing with existing OpenSpeedTest UI
   - Manages signaling server communication
   - Handles test orchestration and results

7. **WebRTC Signaling Server** (`server/webrtc-server.py`)
   - WebSocket-based signaling for WebRTC connection establishment
   - Handles speed test coordination
   - Serves static files

## Installation

### Prerequisites

- Python 3.7+ with `websockets` library
- Modern web browser with WebRTC support (for WebRTC testing)

### Setup

1. **Start all servers using the startup script:**
   ```bash
   ./start-servers.sh
   ```
   
   This will start:
   - UDP Server (port 9001)
   - HTTP-UDP Bridge (port 8080) 
   - WebRTC Signaling Server (port 8081)

2. **Or start servers individually:**
   ```bash
   # Install Python dependencies
   pip3 install -r server/requirements.txt
   
   # Start UDP server
   python3 server/udp-server.py --udp-port 9001 --ws-port 9002
   
   # Start HTTP-UDP bridge (in another terminal)
   python3 server/http-udp-bridge.py --http-port 8080 --udp-port 9001
   
   # Start WebRTC server (in another terminal)  
   python3 server/webrtc-server.py --http-port 8081 --ws-port 8082
   ```

3. **Open the speed test in your browser:**
   ```
   http://localhost:8080  (Main interface with all protocols)
   http://localhost:8081  (WebRTC-focused interface)
   ```

4. **Stop all servers:**
   ```bash
   ./stop-servers.sh
   ```

## Technical Details

### WebRTC DataChannel Configuration

The implementation uses the following DataChannel configuration for UDP-like behavior:

```javascript
{
  ordered: false,        // Don't guarantee packet order (UDP-like)
  maxRetransmits: 0,     // Don't retransmit lost packets (UDP-like)
  protocol: 'speed-test' // Custom protocol identifier
}
```

### Transport Protocol

- **Underlying Protocol**: SCTP over DTLS over UDP
- **Benefits**: Lower latency than TCP, packet loss tolerance
- **Reliability**: Configurable (unreliable mode for UDP-like behavior)

### Speed Testing Process

1. **Connection Establishment**:
   - WebRTC peer connection setup via signaling server
   - ICE candidate exchange for optimal network path
   - DataChannel creation with UDP-like configuration

2. **Latency Testing**:
   - Ping-pong messages through DataChannel
   - Multiple samples for accurate measurement
   - Jitter calculation from ping variations

3. **Download Testing**:
   - Server sends continuous data packets
   - Client measures received data rate
   - Real-time speed calculation and display

4. **Upload Testing**:
   - Client sends continuous data packets
   - Server measures received data rate
   - Throughput feedback via signaling channel

## Browser Compatibility

### Supported Browsers
- Chrome 56+
- Firefox 52+
- Safari 11+
- Edge 79+

### Fallback Behavior
If WebRTC is not supported or fails to initialize, the application automatically falls back to the standard HTTP-based speed test.

## Performance Characteristics

### Advantages over HTTP Testing
- **Lower Latency**: Direct peer-to-peer communication
- **UDP-like Behavior**: Unordered, unreliable packet delivery
- **Better Congestion Control**: SCTP provides advanced congestion control
- **Real-time Metrics**: Immediate feedback on network performance

### Limitations
- **Browser Dependency**: Requires WebRTC support
- **NAT Traversal**: May require STUN/TURN servers for some networks
- **Signaling Overhead**: Initial connection setup is more complex

## Configuration

### Server Configuration

The signaling server can be configured via environment variables:

```bash
PORT=8080 node webrtc-server.js
```

### Client Configuration

WebRTC testing can be disabled by removing the script includes from `index.html`:

```html
<!-- Remove these lines to disable WebRTC testing -->
<script src="assets/js/webrtc-speed-test.js"></script>
<script src="assets/js/webrtc-integration.js"></script>
```

## Development

### Adding Features

To extend the WebRTC implementation:

1. Modify `WebRTCSpeedTest` class for core functionality
2. Update `WebRTCSpeedTestIntegration` for UI integration
3. Extend signaling server for additional coordination

### Testing

To test the WebRTC implementation:

1. Start the signaling server
2. Open multiple browser tabs to the speed test
3. Monitor browser console for WebRTC status messages
4. Check network tab for WebRTC traffic patterns

## Troubleshooting

### Common Issues

1. **WebRTC Not Available**: Check browser compatibility and HTTPS requirement
2. **Connection Failures**: Verify signaling server is running and accessible
3. **Performance Issues**: Check network configuration and firewall settings

### Debug Information

Enable detailed logging by setting:

```javascript
// In browser console
localStorage.setItem('webrtc-debug', 'true');
```

## Security Considerations

- **DTLS Encryption**: All DataChannel communication is encrypted
- **Origin Validation**: Signaling server validates connection origins
- **No Direct File Access**: All operations are memory-based

## Future Enhancements

- **Multiple Server Support**: Connect to multiple test servers
- **Adaptive Bitrate**: Adjust test parameters based on network conditions
- **Advanced Metrics**: Packet loss, out-of-order delivery statistics
- **TURN Server Integration**: Better NAT traversal support

## License

This WebRTC implementation follows the same MIT license as the original OpenSpeedTest project.
