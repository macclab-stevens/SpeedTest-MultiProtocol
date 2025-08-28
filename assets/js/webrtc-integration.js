/*
     WebRTC UDP-like Speed Test Integration
     This extends the original OpenSpeedTest with WebRTC DataChannel testing
     Uses SCTP over UDP for lower-level network performance testing
*/ 

// Global WebRTC speed test instance
let webrtcSpeedTest = null;
let webrtcSignalingSocket = null;
let isWebRTCMode = false;

// WebRTC Speed Test Integration Class
class WebRTCSpeedTestIntegration {
    constructor() {
        this.speedTest = null;
        this.signalingSocket = null;
        this.isConnected = false;
        this.currentTest = null;
        this.signalingServerUrl = `ws://${window.location.hostname}:8081`;
    }

    async initialize() {
        try {
            // Connect to signaling server
            await this.connectToSignalingServer();
            
            // Initialize WebRTC speed test
            this.speedTest = new WebRTCSpeedTest();
            await this.speedTest.initializePeerConnection();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            console.log('WebRTC Speed Test initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize WebRTC Speed Test:', error);
            return false;
        }
    }

    connectToSignalingServer() {
        return new Promise((resolve, reject) => {
            try {
                this.signalingSocket = new WebSocket(this.signalingServerUrl);
                
                this.signalingSocket.onopen = () => {
                    console.log('Connected to signaling server');
                    this.isConnected = true;
                    resolve();
                };
                
                this.signalingSocket.onmessage = (event) => {
                    this.handleSignalingMessage(event.data);
                };
                
                this.signalingSocket.onerror = (error) => {
                    console.error('Signaling socket error:', error);
                    reject(error);
                };
                
                this.signalingSocket.onclose = () => {
                    console.log('Disconnected from signaling server');
                    this.isConnected = false;
                };
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Signaling server connection timeout'));
                    }
                }, 5000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    handleSignalingMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'welcome':
                    console.log('Received welcome from signaling server');
                    this.establishPeerConnection();
                    break;
                case 'answer':
                    this.speedTest.handleAnswer(message.answer);
                    break;
                case 'ice-candidate':
                    this.speedTest.handleIceCandidate(message.candidate);
                    break;
                case 'download-complete':
                    this.handleDownloadComplete();
                    break;
                case 'upload-complete':
                    this.handleUploadComplete(message.results);
                    break;
                case 'pong':
                    this.handlePingResponse(message);
                    break;
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
        }
    }

    async establishPeerConnection() {
        try {
            const offer = await this.speedTest.createOffer();
            if (offer) {
                this.signalingSocket.send(JSON.stringify({
                    type: 'offer',
                    offer: offer
                }));
            }
        } catch (error) {
            console.error('Failed to establish peer connection:', error);
        }
    }

    setupEventHandlers() {
        // Download progress handler
        this.speedTest.onDownloadProgress = (speedMbps) => {
            this.updateDownloadSpeed(speedMbps);
        };

        // Upload progress handler  
        this.speedTest.onUploadProgress = (speedMbps) => {
            this.updateUploadSpeed(speedMbps);
        };

        // Download complete handler
        this.speedTest.onDownloadComplete = (speedMbps) => {
            this.handleDownloadComplete(speedMbps);
        };

        // Upload complete handler
        this.speedTest.onUploadComplete = (speedMbps) => {
            this.handleUploadComplete({ speedMbps });
        };
    }

    async startPingTest() {
        if (!this.speedTest) {
            console.error('WebRTC Speed Test not initialized');
            return;
        }

        try {
            Status = "Testing Latency";
            Show.statusMessage("Testing Latency");
            
            const pingSamples = [];
            const pingCount = 10;
            
            for (let i = 0; i < pingCount; i++) {
                const latency = await this.speedTest.measureLatency();
                if (latency !== null) {
                    pingSamples.push(latency);
                    Show.LiveSpeed(latency, "Ping");
                    Show.pingResults(latency, "Ping");
                }
                
                // Wait 100ms between pings
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (pingSamples.length > 0) {
                const avgPing = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
                const jitter = this.calculateJitter(pingSamples);
                
                Show.pingResults(avgPing, "Final");
                Show.jitterResult(jitter, "Final");
                
                console.log('Ping test completed:', {
                    average: avgPing.toFixed(2) + 'ms',
                    jitter: jitter.toFixed(2) + 'ms',
                    samples: pingSamples.length
                });
            }
        } catch (error) {
            console.error('Ping test failed:', error);
        }
    }

    calculateJitter(pingSamples) {
        if (pingSamples.length < 2) return 0;
        
        let jitterSum = 0;
        for (let i = 1; i < pingSamples.length; i++) {
            jitterSum += Math.abs(pingSamples[i] - pingSamples[i - 1]);
        }
        
        return jitterSum / (pingSamples.length - 1);
    }

    async startDownloadTest() {
        if (!this.speedTest) {
            console.error('WebRTC Speed Test not initialized');
            return;
        }

        try {
            Status = "initDown";
            Show.statusMessage("Initializing Download Test");
            
            // Start download test via signaling server
            this.signalingSocket.send(JSON.stringify({
                type: 'start-speed-test',
                testType: 'download',
                duration: dlDuration
            }));
            
            this.currentTest = 'download';
            this.speedTest.startDownloadTest(dlDuration);
            
        } catch (error) {
            console.error('Download test failed:', error);
            Status = "Error";
            Show.statusMessage("Download Test Failed");
        }
    }

    async startUploadTest() {
        if (!this.speedTest) {
            console.error('WebRTC Speed Test not initialized');
            return;
        }

        try {
            Status = "initup";
            Show.statusMessage("Initializing Upload Test");
            
            // Start upload test via signaling server
            this.signalingSocket.send(JSON.stringify({
                type: 'start-speed-test',
                testType: 'upload',
                duration: ulDuration
            }));
            
            this.currentTest = 'upload';
            this.speedTest.startUploadTest(ulDuration);
            
        } catch (error) {
            console.error('Upload test failed:', error);
            Status = "Error";
            Show.statusMessage("Upload Test Failed");
        }
    }

    updateDownloadSpeed(speedMbps) {
        if (typeof Show !== 'undefined') {
            Show.LiveSpeed(speedMbps, "Download");
            Show.downloadResult(speedMbps);
        }
    }

    updateUploadSpeed(speedMbps) {
        if (typeof Show !== 'undefined') {
            Show.LiveSpeed(speedMbps, "Upload");
            Show.uploadResult(speedMbps);
        }
    }

    handleDownloadComplete(speedMbps) {
        console.log('Download test completed:', speedMbps + ' Mbps');
        this.currentTest = null;
        
        if (typeof Show !== 'undefined') {
            Show.downloadResult(speedMbps);
            Show.statusMessage("Download Test Complete");
        }
        
        // Automatically start upload test if configured
        setTimeout(() => {
            this.startUploadTest();
        }, 1000);
    }

    handleUploadComplete(results) {
        console.log('Upload test completed:', results);
        this.currentTest = null;
        
        if (typeof Show !== 'undefined') {
            Show.uploadResult(results.speedMbps || results);
            Show.statusMessage("All Tests Complete");
        }
        
        Status = "Done";
    }

    handlePingResponse(message) {
        const latency = performance.now() - message.timestamp;
        if (typeof Show !== 'undefined') {
            Show.LiveSpeed(latency, "Ping");
            Show.pingResults(latency, "Ping");
        }
    }

    disconnect() {
        if (this.speedTest) {
            this.speedTest.close();
            this.speedTest = null;
        }
        
        if (this.signalingSocket) {
            this.signalingSocket.close();
            this.signalingSocket = null;
        }
        
        this.isConnected = false;
        this.currentTest = null;
    }
}

// Initialize WebRTC integration when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if WebRTC is supported
    if (!window.RTCPeerConnection) {
        console.warn('WebRTC not supported in this browser');
        return;
    }

    try {
        webrtcSpeedTest = new WebRTCSpeedTestIntegration();
        const initialized = await webrtcSpeedTest.initialize();
        
        if (initialized) {
            isWebRTCMode = true;
            console.log('WebRTC mode enabled');
            
            // Add UI indicator for WebRTC mode
            const indicator = document.createElement('div');
            indicator.id = 'webrtc-indicator';
            indicator.innerHTML = 'WebRTC UDP-like Mode';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #4CAF50;
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000;
            `;
            document.body.appendChild(indicator);
        } else {
            console.log('Falling back to standard HTTP speed test');
        }
    } catch (error) {
        console.error('WebRTC initialization failed:', error);
        console.log('Falling back to standard HTTP speed test');
    }
});

// Override the main speed test functions when in WebRTC mode
function runWebRTCSpeedTest() {
    if (!isWebRTCMode || !webrtcSpeedTest) {
        console.log('WebRTC mode not available, using standard test');
        return false;
    }

    // Run WebRTC-based speed test sequence
    webrtcSpeedTest.startPingTest().then(() => {
        setTimeout(() => {
            webrtcSpeedTest.startDownloadTest();
        }, 1000);
    });
    
    return true;
}

// Export for global access
window.webrtcSpeedTest = webrtcSpeedTest;
window.runWebRTCSpeedTest = runWebRTCSpeedTest;
window.isWebRTCMode = isWebRTCMode;
