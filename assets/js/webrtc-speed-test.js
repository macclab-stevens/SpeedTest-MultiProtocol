/*
    WebRTC-based Speed Test Implementation
    Uses SCTP DataChannels over UDP for lower-level network testing
    This is the closest we can get to UDP testing in web browsers
*/

class WebRTCSpeedTest {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.isTestRunning = false;
        this.downloadStats = {
            startTime: 0,
            bytesReceived: 0,
            packetsReceived: 0
        };
        this.uploadStats = {
            startTime: 0,
            bytesSent: 0,
            packetsSent: 0
        };
        
        // WebRTC configuration for optimal UDP-like behavior
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };
        
        // DataChannel configuration for UDP-like behavior
        this.dataChannelConfig = {
            ordered: false,        // Don't guarantee packet order (UDP-like)
            maxRetransmits: 0,     // Don't retransmit lost packets (UDP-like)
            protocol: 'speed-test' // Custom protocol identifier
        };
    }

    async initializePeerConnection() {
        try {
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);
            
            // Set up event handlers
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', this.peerConnection.iceConnectionState);
            };
            
            this.peerConnection.ondatachannel = (event) => {
                const channel = event.channel;
                this.setupDataChannel(channel);
            };
            
            return true;
        } catch (error) {
            console.error('Failed to initialize peer connection:', error);
            return false;
        }
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;
        
        channel.onopen = () => {
            console.log('DataChannel opened');
            this.onChannelReady();
        };
        
        channel.onmessage = (event) => {
            this.handleIncomingData(event.data);
        };
        
        channel.onerror = (error) => {
            console.error('DataChannel error:', error);
        };
        
        channel.onclose = () => {
            console.log('DataChannel closed');
        };
    }

    async createOffer() {
        try {
            // Create unreliable data channel for speed testing
            this.dataChannel = this.peerConnection.createDataChannel('speedtest', this.dataChannelConfig);
            this.setupDataChannel(this.dataChannel);
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            return offer;
        } catch (error) {
            console.error('Failed to create offer:', error);
            return null;
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
            return true;
        } catch (error) {
            console.error('Failed to handle answer:', error);
            return false;
        }
    }

    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
            return true;
        } catch (error) {
            console.error('Failed to add ICE candidate:', error);
            return false;
        }
    }

    onChannelReady() {
        console.log('WebRTC DataChannel ready for speed testing');
        // Channel is ready for bidirectional communication
    }

    startDownloadTest(duration = 10000) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.error('DataChannel not ready');
            return false;
        }

        this.isTestRunning = true;
        this.downloadStats = {
            startTime: performance.now(),
            bytesReceived: 0,
            packetsReceived: 0
        };

        // Request download test from server
        const request = JSON.stringify({
            type: 'download_test',
            duration: duration,
            packetSize: 1024 * 16 // 16KB packets
        });
        
        this.dataChannel.send(request);
        
        // Set up test completion timer
        setTimeout(() => {
            this.stopDownloadTest();
        }, duration);

        return true;
    }

    startUploadTest(duration = 10000) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.error('DataChannel not ready');
            return false;
        }

        this.isTestRunning = true;
        this.uploadStats = {
            startTime: performance.now(),
            bytesSent: 0,
            packetsSent: 0
        };

        // Generate test data
        const testData = new ArrayBuffer(1024 * 16); // 16KB packets
        const view = new Uint8Array(testData);
        
        // Fill with random data
        for (let i = 0; i < view.length; i++) {
            view[i] = Math.floor(Math.random() * 256);
        }

        // Send packets continuously
        const uploadInterval = setInterval(() => {
            if (!this.isTestRunning) {
                clearInterval(uploadInterval);
                return;
            }

            try {
                this.dataChannel.send(testData);
                this.uploadStats.bytesSent += testData.byteLength;
                this.uploadStats.packetsSent++;
                
                // Update UI with current upload speed
                this.updateUploadSpeed();
            } catch (error) {
                console.error('Upload error:', error);
                clearInterval(uploadInterval);
            }
        }, 10); // Send every 10ms for high throughput

        // Set up test completion timer
        setTimeout(() => {
            this.stopUploadTest();
            clearInterval(uploadInterval);
        }, duration);

        return true;
    }

    handleIncomingData(data) {
        if (!this.isTestRunning) return;

        this.downloadStats.bytesReceived += data.byteLength || data.length;
        this.downloadStats.packetsReceived++;
        
        // Update UI with current download speed
        this.updateDownloadSpeed();
    }

    stopDownloadTest() {
        this.isTestRunning = false;
        const duration = performance.now() - this.downloadStats.startTime;
        const speedMbps = (this.downloadStats.bytesReceived * 8) / (duration / 1000) / 1000000;
        
        console.log('Download test completed:', {
            duration: duration + 'ms',
            bytesReceived: this.downloadStats.bytesReceived,
            packetsReceived: this.downloadStats.packetsReceived,
            speedMbps: speedMbps.toFixed(2) + ' Mbps'
        });

        // Notify UI
        if (typeof this.onDownloadComplete === 'function') {
            this.onDownloadComplete(speedMbps);
        }
    }

    stopUploadTest() {
        this.isTestRunning = false;
        const duration = performance.now() - this.uploadStats.startTime;
        const speedMbps = (this.uploadStats.bytesSent * 8) / (duration / 1000) / 1000000;
        
        console.log('Upload test completed:', {
            duration: duration + 'ms',
            bytesSent: this.uploadStats.bytesSent,
            packetsSent: this.uploadStats.packetsSent,
            speedMbps: speedMbps.toFixed(2) + ' Mbps'
        });

        // Notify UI
        if (typeof this.onUploadComplete === 'function') {
            this.onUploadComplete(speedMbps);
        }
    }

    updateDownloadSpeed() {
        if (!this.isTestRunning) return;
        
        const duration = performance.now() - this.downloadStats.startTime;
        const speedMbps = (this.downloadStats.bytesReceived * 8) / (duration / 1000) / 1000000;
        
        // Notify UI of live speed update
        if (typeof this.onDownloadProgress === 'function') {
            this.onDownloadProgress(speedMbps);
        }
    }

    updateUploadSpeed() {
        if (!this.isTestRunning) return;
        
        const duration = performance.now() - this.uploadStats.startTime;
        const speedMbps = (this.uploadStats.bytesSent * 8) / (duration / 1000) / 1000000;
        
        // Notify UI of live speed update
        if (typeof this.onUploadProgress === 'function') {
            this.onUploadProgress(speedMbps);
        }
    }

    measureLatency() {
        return new Promise((resolve) => {
            if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
                resolve(null);
                return;
            }

            const startTime = performance.now();
            const pingData = JSON.stringify({
                type: 'ping',
                timestamp: startTime
            });

            // Set up one-time message handler for pong response
            const messageHandler = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.type === 'pong') {
                        const latency = performance.now() - response.timestamp;
                        this.dataChannel.removeEventListener('message', messageHandler);
                        resolve(latency);
                    }
                } catch (error) {
                    // Not a ping response, ignore
                }
            };

            this.dataChannel.addEventListener('message', messageHandler);
            this.dataChannel.send(pingData);

            // Timeout after 5 seconds
            setTimeout(() => {
                this.dataChannel.removeEventListener('message', messageHandler);
                resolve(null);
            }, 5000);
        });
    }

    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.isTestRunning = false;
    }
}

// Export for use in main application
window.WebRTCSpeedTest = WebRTCSpeedTest;
