/*
   OpenSpeedTest Configuration for UDP-like Testing
   
   This file controls the behavior of the WebRTC UDP-like testing features.
   Modify these settings to customize the testing behavior.
*/

// WebRTC Configuration
const WEBRTC_CONFIG = {
    // Enable or disable WebRTC UDP-like testing
    enabled: true,
    
    // Signaling server configuration
    signaling: {
        host: window.location.hostname,
        port: 8081,
        protocol: 'ws'
    },
    
    // WebRTC peer connection configuration
    peerConnection: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
    },
    
    // DataChannel configuration for UDP-like behavior
    dataChannel: {
        ordered: false,        // Don't guarantee packet order (UDP-like)
        maxRetransmits: 0,     // Don't retransmit lost packets (UDP-like)
        protocol: 'speed-test',
        // Packet size for testing (bytes)
        packetSize: 16 * 1024  // 16KB
    },
    
    // Test configuration
    testing: {
        // Number of ping samples for latency testing
        pingSamples: 10,
        
        // Interval between ping tests (ms)
        pingInterval: 100,
        
        // Default test duration (ms)
        defaultDuration: 10000,
        
        // Packet sending interval during tests (ms)
        packetInterval: 10
    },
    
    // Fallback behavior
    fallback: {
        // Automatically fall back to HTTP testing if WebRTC fails
        autoFallback: true,
        
        // Timeout for WebRTC connection establishment (ms)
        connectionTimeout: 5000
    },
    
    // UI configuration
    ui: {
        // Show WebRTC mode indicator
        showModeIndicator: true,
        
        // Indicator text
        indicatorText: 'WebRTC UDP-like Mode',
        
        // Indicator styling
        indicatorStyle: {
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: '#4CAF50',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: '1000'
        }
    },
    
    // Debug configuration
    debug: {
        // Enable detailed console logging
        enabled: false,
        
        // Log WebRTC connection details
        logConnections: false,
        
        // Log data transfer details
        logDataTransfer: false
    }
};

// Export configuration for use by other modules
if (typeof window !== 'undefined') {
    window.WEBRTC_CONFIG = WEBRTC_CONFIG;
}

// Node.js export for server-side usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WEBRTC_CONFIG;
}
