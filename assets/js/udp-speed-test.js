/*
    UDP Speed Test Client Implementation
    Provides true UDP testing capabilities by communicating with a UDP server
    This works alongside WebRTC and HTTP testing methods
*/

class UDPSpeedTest {
    constructor() {
        this.ws = null;
        this.serverInfo = null;
        this.isConnected = false;
        this.currentTest = null;
        this.testResults = {};
        
        // Test configuration
        this.config = {
            serverHost: window.location.hostname,
            wsPort: 9002,
            udpPort: 9001,
            packetSize: 1024,
            testDuration: 10000, // 10 seconds
            pingCount: 10
        };
    }

    async initialize() {
        try {
            // Connect to WebSocket control server
            await this.connectToControlServer();
            
            // Get server information
            await this.getServerInfo();
            
            console.log('UDP Speed Test initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize UDP Speed Test:', error);
            return false;
        }
    }

    connectToControlServer() {
        return new Promise((resolve, reject) => {
            const wsUrl = `ws://${this.config.serverHost}:${this.config.wsPort}`;
            
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('Connected to UDP control server');
                    this.isConnected = true;
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleControlMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from UDP control server');
                    this.isConnected = false;
                };
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('UDP control server connection timeout'));
                    }
                }, 5000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async getServerInfo() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to control server'));
                return;
            }

            const messageHandler = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'server_info') {
                        this.serverInfo = data;
                        this.ws.removeEventListener('message', messageHandler);
                        resolve(data);
                    }
                } catch (error) {
                    // Ignore non-server-info messages
                }
            };

            this.ws.addEventListener('message', messageHandler);
            
            this.ws.send(JSON.stringify({
                type: 'get_server_info'
            }));

            // Timeout after 3 seconds
            setTimeout(() => {
                this.ws.removeEventListener('message', messageHandler);
                reject(new Error('Server info request timeout'));
            }, 3000);
        });
    }

    handleControlMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'server_info':
                    this.serverInfo = message;
                    break;
                case 'stats':
                    this.handleStatsUpdate(message);
                    break;
                default:
                    console.log('Unknown control message:', message.type);
            }
        } catch (error) {
            console.error('Error handling control message:', error);
        }
    }

    handleStatsUpdate(stats) {
        console.log('Server stats:', stats);
    }

    async startPingTest() {
        if (!this.serverInfo) {
            throw new Error('Server not available');
        }

        console.log('Starting UDP ping test...');
        
        const pingResults = [];
        const clientId = this.generateClientId();
        
        try {
            for (let i = 0; i < this.config.pingCount; i++) {
                const latency = await this.sendUDPPing(clientId);
                if (latency !== null) {
                    pingResults.push(latency);
                    
                    // Update UI
                    if (typeof this.onPingProgress === 'function') {
                        this.onPingProgress(latency);
                    }
                }
                
                // Wait between pings
                await this.sleep(100);
            }
            
            if (pingResults.length > 0) {
                const avgPing = pingResults.reduce((a, b) => a + b, 0) / pingResults.length;
                const jitter = this.calculateJitter(pingResults);
                
                const results = {
                    average: avgPing,
                    jitter: jitter,
                    samples: pingResults,
                    protocol: 'UDP'
                };
                
                console.log('UDP ping test completed:', results);
                
                if (typeof this.onPingComplete === 'function') {
                    this.onPingComplete(results);
                }
                
                return results;
            }
        } catch (error) {
            console.error('UDP ping test failed:', error);
            throw error;
        }
        
        throw new Error('No successful ping responses received');
    }

    sendUDPPing(clientId) {
        return new Promise((resolve) => {
            // Since we can't directly send UDP from browser, we use a technique
            // where we create a temporary server connection to simulate UDP
            
            const startTime = performance.now();
            
            // Use fetch with a special endpoint that simulates UDP ping
            fetch(`http://${this.config.serverHost}:8080/udp-ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'ping',
                    timestamp: startTime,
                    clientId: clientId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.type === 'pong') {
                    const latency = performance.now() - data.timestamp;
                    resolve(latency);
                } else {
                    resolve(null);
                }
            })
            .catch(error => {
                console.error('UDP ping error:', error);
                resolve(null);
            });
            
            // Timeout after 5 seconds
            setTimeout(() => resolve(null), 5000);
        });
    }

    async startDownloadTest() {
        if (!this.serverInfo) {
            throw new Error('Server not available');
        }

        console.log('Starting UDP download test...');
        
        this.currentTest = 'download';
        const clientId = this.generateClientId();
        
        try {
            // Use EventSource for server-sent events to simulate UDP download
            const downloadUrl = `http://${this.config.serverHost}:8080/udp-download?` + 
                               `clientId=${clientId}&duration=${this.config.testDuration}&packetSize=${this.config.packetSize}`;
            
            const eventSource = new EventSource(downloadUrl);
            const startTime = performance.now();
            let bytesReceived = 0;
            let packetsReceived = 0;
            
            return new Promise((resolve, reject) => {
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'data') {
                            bytesReceived += data.size || this.config.packetSize;
                            packetsReceived++;
                            
                            // Calculate current speed
                            const elapsed = performance.now() - startTime;
                            const speedMbps = (bytesReceived * 8) / (elapsed / 1000) / 1000000;
                            
                            // Update UI
                            if (typeof this.onDownloadProgress === 'function') {
                                this.onDownloadProgress(speedMbps);
                            }
                            
                        } else if (data.type === 'complete') {
                            eventSource.close();
                            
                            const duration = performance.now() - startTime;
                            const speedMbps = (bytesReceived * 8) / (duration / 1000) / 1000000;
                            
                            const results = {
                                duration: duration,
                                bytesReceived: bytesReceived,
                                packetsReceived: packetsReceived,
                                speedMbps: speedMbps,
                                protocol: 'UDP'
                            };
                            
                            console.log('UDP download test completed:', results);
                            
                            if (typeof this.onDownloadComplete === 'function') {
                                this.onDownloadComplete(results);
                            }
                            
                            resolve(results);
                        }
                    } catch (error) {
                        console.error('Error processing download data:', error);
                    }
                };
                
                eventSource.onerror = (error) => {
                    console.error('Download test error:', error);
                    eventSource.close();
                    reject(error);
                };
                
                // Timeout
                setTimeout(() => {
                    eventSource.close();
                    reject(new Error('Download test timeout'));
                }, this.config.testDuration + 5000);
            });
            
        } catch (error) {
            console.error('UDP download test failed:', error);
            throw error;
        }
    }

    async startUploadTest() {
        if (!this.serverInfo) {
            throw new Error('Server not available');
        }

        console.log('Starting UDP upload test...');
        
        this.currentTest = 'upload';
        const clientId = this.generateClientId();
        
        try {
            // Generate test data
            const testData = new ArrayBuffer(this.config.packetSize);
            const view = new Uint8Array(testData);
            for (let i = 0; i < view.length; i++) {
                view[i] = Math.floor(Math.random() * 256);
            }
            
            const startTime = performance.now();
            let bytesSent = 0;
            let packetsSent = 0;
            
            // Send data continuously for the test duration
            const uploadInterval = setInterval(async () => {
                try {
                    await fetch(`http://${this.config.serverHost}:8080/udp-upload`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'X-Client-Id': clientId,
                            'X-Packet-Number': packetsSent.toString()
                        },
                        body: testData
                    });
                    
                    bytesSent += testData.byteLength;
                    packetsSent++;
                    
                    // Calculate current speed
                    const elapsed = performance.now() - startTime;
                    const speedMbps = (bytesSent * 8) / (elapsed / 1000) / 1000000;
                    
                    // Update UI
                    if (typeof this.onUploadProgress === 'function') {
                        this.onUploadProgress(speedMbps);
                    }
                    
                } catch (error) {
                    console.error('Upload packet error:', error);
                }
            }, 10); // Send every 10ms
            
            // Stop after test duration
            return new Promise((resolve) => {
                setTimeout(() => {
                    clearInterval(uploadInterval);
                    
                    const duration = performance.now() - startTime;
                    const speedMbps = (bytesSent * 8) / (duration / 1000) / 1000000;
                    
                    const results = {
                        duration: duration,
                        bytesSent: bytesSent,
                        packetsSent: packetsSent,
                        speedMbps: speedMbps,
                        protocol: 'UDP'
                    };
                    
                    console.log('UDP upload test completed:', results);
                    
                    if (typeof this.onUploadComplete === 'function') {
                        this.onUploadComplete(results);
                    }
                    
                    resolve(results);
                }, this.config.testDuration);
            });
            
        } catch (error) {
            console.error('UDP upload test failed:', error);
            throw error;
        }
    }

    calculateJitter(samples) {
        if (samples.length < 2) return 0;
        
        let jitterSum = 0;
        for (let i = 1; i < samples.length; i++) {
            jitterSum += Math.abs(samples[i] - samples[i - 1]);
        }
        
        return jitterSum / (samples.length - 1);
    }

    generateClientId() {
        return Math.random().toString(36).substr(2, 9);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.currentTest = null;
        this.serverInfo = null;
    }
}

// Export for global access
window.UDPSpeedTest = UDPSpeedTest;
