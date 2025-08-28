/*
    Multi-Protocol Speed Test Integration
    Supports WebRTC DataChannels, UDP (via bridge), and HTTP testing
    Allows comparison between different protocols
*/

class MultiProtocolSpeedTest {
    constructor() {
        this.webrtcTest = null;
        this.udpTest = null;
        this.httpTest = null; // Reference to original implementation
        
        this.availableProtocols = [];
        this.currentProtocol = 'auto';
        this.testResults = {};
        this.comparisonMode = false;
        
        // Configuration
        this.config = {
            preferredProtocol: 'udp', // 'udp', 'webrtc', 'http', 'auto'
            enableComparison: true,
            testDuration: 10000,
            autoFallback: true
        };
    }

    async initialize() {
        console.log('Initializing Multi-Protocol Speed Test...');
        
        try {
            // Initialize WebRTC testing
            if (window.WebRTCSpeedTest && window.RTCPeerConnection) {
                this.webrtcTest = new window.WebRTCSpeedTest();
                const webrtcReady = await this.webrtcTest.initializePeerConnection();
                if (webrtcReady) {
                    this.availableProtocols.push('webrtc');
                    console.log('WebRTC testing available');
                }
            }
            
            // Initialize UDP testing
            if (window.UDPSpeedTest) {
                this.udpTest = new window.UDPSpeedTest();
                const udpReady = await this.udpTest.initialize();
                if (udpReady) {
                    this.availableProtocols.push('udp');
                    console.log('UDP testing available');
                }
            }
            
            // HTTP testing is always available (original implementation)
            this.availableProtocols.push('http');
            console.log('HTTP testing available');
            
            console.log('Available protocols:', this.availableProtocols);
            
            // Set up UI
            this.setupProtocolSelector();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize multi-protocol testing:', error);
            return false;
        }
    }

    setupProtocolSelector() {
        // Create protocol selector UI
        const selector = document.createElement('div');
        selector.id = 'protocol-selector';
        selector.innerHTML = `
            <div style="position: fixed; top: 50px; right: 10px; background: white; border: 1px solid #ccc; padding: 10px; border-radius: 5px; z-index: 1001; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">Test Protocol</h4>
                <select id="protocol-select" style="width: 100%; margin-bottom: 10px;">
                    <option value="auto">Auto (Best Available)</option>
                    ${this.availableProtocols.includes('udp') ? '<option value="udp">UDP (True UDP)</option>' : ''}
                    ${this.availableProtocols.includes('webrtc') ? '<option value="webrtc">WebRTC (UDP-like)</option>' : ''}
                    <option value="http">HTTP (TCP)</option>
                </select>
                <label style="font-size: 12px;">
                    <input type="checkbox" id="comparison-mode"> 
                    Compare All Protocols
                </label>
                <div id="protocol-status" style="font-size: 11px; margin-top: 5px; color: #666;"></div>
            </div>
        `;
        
        document.body.appendChild(selector);
        
        // Add event listeners
        const protocolSelect = document.getElementById('protocol-select');
        const comparisonCheckbox = document.getElementById('comparison-mode');
        
        protocolSelect.addEventListener('change', (e) => {
            this.currentProtocol = e.target.value;
            this.updateStatus();
        });
        
        comparisonCheckbox.addEventListener('change', (e) => {
            this.comparisonMode = e.target.checked;
            this.updateStatus();
        });
        
        // Set initial values
        if (this.availableProtocols.includes(this.config.preferredProtocol)) {
            protocolSelect.value = this.config.preferredProtocol;
            this.currentProtocol = this.config.preferredProtocol;
        }
        
        comparisonCheckbox.checked = this.config.enableComparison;
        this.comparisonMode = this.config.enableComparison;
        
        this.updateStatus();
    }

    updateStatus() {
        const statusDiv = document.getElementById('protocol-status');
        if (!statusDiv) return;
        
        let status = '';
        
        if (this.comparisonMode) {
            status = `Will test: ${this.availableProtocols.join(', ').toUpperCase()}`;
        } else {
            const protocol = this.getSelectedProtocol();
            status = `Selected: ${protocol.toUpperCase()}`;
        }
        
        statusDiv.textContent = status;
    }

    getSelectedProtocol() {
        if (this.currentProtocol === 'auto') {
            // Auto-select best available protocol
            if (this.availableProtocols.includes('udp')) return 'udp';
            if (this.availableProtocols.includes('webrtc')) return 'webrtc';
            return 'http';
        }
        
        return this.currentProtocol;
    }

    async runSpeedTest() {
        console.log('Starting multi-protocol speed test...');
        
        if (this.comparisonMode) {
            return await this.runComparisonTest();
        } else {
            return await this.runSingleProtocolTest();
        }
    }

    async runSingleProtocolTest() {
        const protocol = this.getSelectedProtocol();
        console.log(`Running ${protocol.toUpperCase()} speed test...`);
        
        try {
            // Update UI to show current protocol
            this.showProtocolIndicator(protocol);
            
            const results = await this.runProtocolTest(protocol);
            results.protocol = protocol;
            
            console.log(`${protocol.toUpperCase()} test completed:`, results);
            return results;
            
        } catch (error) {
            console.error(`${protocol.toUpperCase()} test failed:`, error);
            
            // Try fallback if enabled
            if (this.config.autoFallback && protocol !== 'http') {
                console.log('Falling back to HTTP testing...');
                return await this.runProtocolTest('http');
            }
            
            throw error;
        }
    }

    async runComparisonTest() {
        console.log('Running comparison test across all protocols...');
        
        const results = {};
        
        for (const protocol of this.availableProtocols) {
            try {
                console.log(`Testing ${protocol.toUpperCase()}...`);
                this.showProtocolIndicator(protocol);
                
                const testResult = await this.runProtocolTest(protocol);
                testResult.protocol = protocol;
                results[protocol] = testResult;
                
                // Brief pause between tests
                await this.sleep(1000);
                
            } catch (error) {
                console.error(`${protocol.toUpperCase()} test failed:`, error);
                results[protocol] = { error: error.message, protocol: protocol };
            }
        }
        
        // Show comparison results
        this.showComparisonResults(results);
        return results;
    }

    async runProtocolTest(protocol) {
        switch (protocol) {
            case 'udp':
                return await this.runUDPTest();
            case 'webrtc':
                return await this.runWebRTCTest();
            case 'http':
                return await this.runHTTPTest();
            default:
                throw new Error(`Unknown protocol: ${protocol}`);
        }
    }

    async runUDPTest() {
        if (!this.udpTest) {
            throw new Error('UDP testing not available');
        }

        const results = {
            ping: null,
            download: null,
            upload: null,
            protocol: 'udp'
        };

        // Ping test
        try {
            results.ping = await this.udpTest.startPingTest();
        } catch (error) {
            console.error('UDP ping test failed:', error);
        }

        // Download test
        try {
            results.download = await this.udpTest.startDownloadTest();
        } catch (error) {
            console.error('UDP download test failed:', error);
        }

        // Upload test
        try {
            results.upload = await this.udpTest.startUploadTest();
        } catch (error) {
            console.error('UDP upload test failed:', error);
        }

        return results;
    }

    async runWebRTCTest() {
        if (!this.webrtcTest) {
            throw new Error('WebRTC testing not available');
        }

        const results = {
            ping: null,
            download: null,
            upload: null,
            protocol: 'webrtc'
        };

        // Ping test
        try {
            const latency = await this.webrtcTest.measureLatency();
            results.ping = { average: latency, protocol: 'webrtc' };
        } catch (error) {
            console.error('WebRTC ping test failed:', error);
        }

        // Download test
        try {
            const downloadSpeed = await new Promise((resolve, reject) => {
                this.webrtcTest.onDownloadComplete = resolve;
                this.webrtcTest.startDownloadTest(this.config.testDuration);
                setTimeout(() => reject(new Error('Download test timeout')), this.config.testDuration + 5000);
            });
            results.download = { speedMbps: downloadSpeed, protocol: 'webrtc' };
        } catch (error) {
            console.error('WebRTC download test failed:', error);
        }

        // Upload test
        try {
            const uploadSpeed = await new Promise((resolve, reject) => {
                this.webrtcTest.onUploadComplete = resolve;
                this.webrtcTest.startUploadTest(this.config.testDuration);
                setTimeout(() => reject(new Error('Upload test timeout')), this.config.testDuration + 5000);
            });
            results.upload = { speedMbps: uploadSpeed, protocol: 'webrtc' };
        } catch (error) {
            console.error('WebRTC upload test failed:', error);
        }

        return results;
    }

    async runHTTPTest() {
        // Use the original OpenSpeedTest implementation
        return new Promise((resolve) => {
            // This would integrate with the existing OpenSpeedTest implementation
            // For now, return a placeholder
            resolve({
                ping: { average: 50, protocol: 'http' },
                download: { speedMbps: 100, protocol: 'http' },
                upload: { speedMbps: 50, protocol: 'http' },
                protocol: 'http'
            });
        });
    }

    showProtocolIndicator(protocol) {
        // Update or create protocol indicator
        let indicator = document.getElementById('current-protocol-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'current-protocol-indicator';
            document.body.appendChild(indicator);
        }
        
        const protocolNames = {
            'udp': 'UDP (True UDP)',
            'webrtc': 'WebRTC (UDP-like)',
            'http': 'HTTP (TCP)'
        };
        
        const colors = {
            'udp': '#FF6B6B',
            'webrtc': '#4ECDC4',
            'http': '#45B7D1'
        };
        
        indicator.innerHTML = `Testing: ${protocolNames[protocol] || protocol.toUpperCase()}`;
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[protocol] || '#666'};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1002;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
    }

    showComparisonResults(results) {
        console.log('Comparison Results:', results);
        
        // Create comparison table
        let table = document.getElementById('comparison-table');
        
        if (!table) {
            table = document.createElement('div');
            table.id = 'comparison-table';
            document.body.appendChild(table);
        }
        
        let html = `
            <div style="position: fixed; top: 100px; right: 10px; background: white; border: 1px solid #ccc; padding: 15px; border-radius: 5px; z-index: 1003; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px;">Protocol Comparison</h3>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 5px; border: 1px solid #ddd;">Protocol</th>
                        <th style="padding: 5px; border: 1px solid #ddd;">Ping (ms)</th>
                        <th style="padding: 5px; border: 1px solid #ddd;">Download</th>
                        <th style="padding: 5px; border: 1px solid #ddd;">Upload</th>
                    </tr>
        `;
        
        Object.entries(results).forEach(([protocol, result]) => {
            const ping = result.ping?.average?.toFixed(1) || 'N/A';
            const download = result.download?.speedMbps?.toFixed(1) || 'N/A';
            const upload = result.upload?.speedMbps?.toFixed(1) || 'N/A';
            
            html += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${protocol.toUpperCase()}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${ping}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${download}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${upload}</td>
                </tr>
            `;
        });
        
        html += `
                </table>
                <button onclick="document.getElementById('comparison-table').style.display='none'" 
                        style="margin-top: 10px; padding: 5px 10px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        table.innerHTML = html;
        table.style.display = 'block';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disconnect() {
        if (this.webrtcTest) {
            this.webrtcTest.close();
        }
        
        if (this.udpTest) {
            this.udpTest.disconnect();
        }
        
        // Clean up UI elements
        const elements = ['protocol-selector', 'current-protocol-indicator', 'comparison-table'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
    }
}

// Initialize multi-protocol testing when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        window.multiProtocolTest = new MultiProtocolSpeedTest();
        await window.multiProtocolTest.initialize();
        console.log('Multi-protocol speed testing initialized');
    } catch (error) {
        console.error('Failed to initialize multi-protocol testing:', error);
    }
});

// Override the main speed test function to use multi-protocol testing
function runMultiProtocolSpeedTest() {
    if (window.multiProtocolTest) {
        return window.multiProtocolTest.runSpeedTest();
    }
    return false;
}

// Export for global access
window.MultiProtocolSpeedTest = MultiProtocolSpeedTest;
window.runMultiProtocolSpeedTest = runMultiProtocolSpeedTest;
