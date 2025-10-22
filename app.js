/**
 * App.js - Main Application Logic
 * Handles WebSocket communication, data management, and component coordination
 */

class App {
    constructor() {
        this.canvas = null;
        this.parser = new ParserV2(); // Use ParserV2 for terminal support
        this.ws = null;
        this.wsUrl = `ws://${window.location.host}`;
        this.reconnectInterval = 2000; // Reconnect every 2 seconds
        this.reconnectTimer = null;
        this.isConnecting = false;
        this.useFallback = false; // Fallback to file polling if WebSocket fails

        // Fallback polling settings
        this.flowDataPath = './data/flow.json';
        this.lastModified = 0;
        this.pollInterval = 200;
        this.maxPollInterval = 2000;

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Claude Flow initializing...');

        // Show loading
        if (window.ui) {
            window.ui.showLoading('Initializing Claude Flow...');
        }

        // Initialize canvas
        const svgElement = document.getElementById('canvas');
        this.canvas = new Canvas(svgElement);

        // Update status
        this.updateStatus('Initializing...');
        if (window.ui) {
            window.ui.updateConnectionStatus(false);
        }

        // Try WebSocket first
        this.connectWebSocket();

        // Fallback to polling after 5 seconds if WebSocket fails
        setTimeout(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.log('WebSocket not available, using fallback polling');
                this.useFallback = true;
                this.loadFlowData();
                this.startPolling();

                if (window.ui) {
                    window.ui.hideLoading();
                    window.ui.info('Fallback Mode', 'Using file polling for updates');
                }
            }
        }, 5000);

        console.log('Claude Flow initialized');
    }

    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        if (this.isConnecting) return;

        this.isConnecting = true;
        this.updateStatus('Connecting to server...');
        this.updateConnectionStatus('connecting');

        try {
            this.ws = new WebSocket(this.wsUrl);

            // Connection opened
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnecting = false;
                this.useFallback = false;
                this.updateStatus('Connected');

                if (window.ui) {
                    window.ui.updateConnectionStatus(true);
                    window.ui.hideLoading();
                    window.ui.success('Connected', 'WebSocket connection established');
                }

                // Request current state
                this.sendMessage({
                    type: 'request_state'
                });

                // Clear any reconnect timer
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            // Message received
            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            // Connection closed
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnecting = false;
                this.updateStatus('Disconnected');

                if (window.ui) {
                    window.ui.updateConnectionStatus(false);
                    window.ui.warning('Disconnected', 'Attempting to reconnect...');
                }

                // Attempt reconnection
                if (!this.reconnectTimer) {
                    this.reconnectTimer = setTimeout(() => {
                        this.reconnectTimer = null;
                        this.connectWebSocket();
                    }, this.reconnectInterval);
                }
            };

            // Connection error
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
                this.updateStatus('Connection error');

                if (window.ui) {
                    window.ui.updateConnectionStatus(false);
                    window.ui.error('Connection Error', 'Failed to connect to WebSocket server');
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.isConnecting = false;
            this.updateStatus('Connection failed');
            this.updateConnectionStatus('error');
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'state':
                    // Full state update
                    console.log('Received state update');
                    this.renderFlowData(message.data);
                    this.updateLastUpdateTime();
                    this.updateStatus('Ready');
                    break;

                case 'node_update':
                    // New nodes added
                    console.log(`Received ${message.nodes.length} new node(s)`);
                    this.handleNodeUpdate(message.nodes, message.edges || []);
                    this.updateLastUpdateTime();
                    break;

                case 'edge_update':
                    // New edges added
                    console.log(`Received ${message.edges.length} new edge(s)`);
                    this.handleEdgeUpdate(message.edges);
                    this.updateLastUpdateTime();
                    break;

                case 'clear':
                    // Canvas cleared
                    console.log('Canvas cleared');
                    this.canvas.clear();
                    this.updateLastUpdateTime();
                    break;

                case 'error':
                    // Server error
                    console.error('Server error:', message.error);
                    this.updateStatus(`Error: ${message.error}`);
                    break;

                case 'ping':
                    // Server ping - respond with pong
                    this.sendMessage({ type: 'pong' });
                    break;

                case 'pong':
                    // Server pong response
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Handle node updates
     */
    handleNodeUpdate(newNodes, newEdges) {
        // Get current data
        const currentData = this.canvas.getData();

        // Merge new nodes and edges
        const mergedData = {
            conversation_id: currentData.conversation_id,
            created_at: currentData.created_at,
            nodes: [...currentData.nodes, ...newNodes],
            edges: [...currentData.edges, ...newEdges]
        };

        // Render updated data
        this.renderFlowData(mergedData);
    }

    /**
     * Handle edge updates
     */
    handleEdgeUpdate(newEdges) {
        // Get current data
        const currentData = this.canvas.getData();

        // Merge new edges
        const mergedData = {
            ...currentData,
            edges: [...currentData.edges, ...newEdges]
        };

        // Render updated data
        this.renderFlowData(mergedData);
    }

    /**
     * Send message to WebSocket server
     */
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    /**
     * Start polling for file updates (fallback mode)
     */
    startPolling() {
        if (!this.useFallback) return;
        this.poll();
    }

    /**
     * Poll for file changes (fallback mode)
     */
    async poll() {
        if (!this.useFallback) return;

        try {
            const hasChanges = await this.checkForUpdates();

            if (hasChanges) {
                this.pollInterval = 200;
            } else {
                this.pollInterval = Math.min(this.pollInterval * 1.1, this.maxPollInterval);
            }
        } catch (error) {
            console.error('Poll error:', error);
            this.updateStatus('Error polling file');
        }

        setTimeout(() => this.poll(), this.pollInterval);
    }

    /**
     * Check for file updates (fallback mode)
     */
    async checkForUpdates() {
        try {
            const response = await fetch(this.flowDataPath, {
                cache: 'no-cache'
            });

            if (!response.ok) {
                return false;
            }

            const lastMod = new Date(response.headers.get('Last-Modified')).getTime();

            if (lastMod > this.lastModified) {
                this.lastModified = lastMod;
                const data = await response.json();
                this.renderFlowData(data);
                this.updateLastUpdateTime();
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load flow data from file (fallback mode)
     */
    async loadFlowData() {
        try {
            const response = await fetch(this.flowDataPath, {
                cache: 'no-cache'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderFlowData(data);
                this.lastModified = new Date(response.headers.get('Last-Modified')).getTime();
                this.updateLastUpdateTime();
            } else {
                console.log('No existing flow data found');
            }
        } catch (error) {
            console.log('Could not load flow data:', error.message);
        }
    }

    /**
     * Render flow data on canvas
     */
    renderFlowData(data) {
        if (!data || !data.nodes) {
            console.warn('Invalid flow data');
            return;
        }

        console.log(`Rendering ${data.nodes.length} nodes`);
        this.canvas.render(data);
        this.updateStatus('Ready');

        // Update UI
        if (window.ui) {
            window.ui.updateNodeCount(data.nodes.length);
            window.ui.toggleEmptyState(data.nodes.length === 0);
        }
    }

    /**
     * Update status message
     */
    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            // Remove all status classes
            statusEl.classList.remove('connected', 'disconnected', 'connecting', 'error');

            // Add current status class
            statusEl.classList.add(status);

            // Update text
            const statusText = {
                'connected': 'Connected',
                'disconnected': 'Disconnected',
                'connecting': 'Connecting...',
                'error': 'Error'
            };
            statusEl.textContent = statusText[status] || status;
        }
    }

    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString();
            lastUpdateEl.textContent = `Last update: ${timeStr}`;
        }
    }

    /**
     * Manual save trigger (for testing)
     * This method can be called from console or via a button
     */
    async saveTestData(inputText, outputText) {
        // Parse interaction
        const parsedData = this.parser.parseInteraction(inputText, outputText);

        // Load existing data
        let existingData;
        try {
            const response = await fetch(this.flowDataPath);
            if (response.ok) {
                existingData = await response.json();
            }
        } catch (error) {
            existingData = this.parser.createEmptyFlow();
        }

        // Merge data
        const mergedData = {
            conversation_id: existingData.conversation_id || parsedData.conversation_id,
            created_at: existingData.created_at || new Date().toISOString(),
            nodes: [...(existingData.nodes || []), ...parsedData.nodes],
            edges: [...(existingData.edges || []), ...parsedData.edges]
        };

        console.log('Saving test data:', mergedData);

        // In a real implementation, this would save to the server
        // For now, we'll just log it
        alert('Test data generated. In production, this would save to flow.json');

        return mergedData;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();

    // Expose methods for console testing
    window.testSave = (input, output) => {
        return window.app.saveTestData(input, output);
    };

    console.log('Claude Flow ready!');
    console.log('Test with: testSave("Hello", "Hi there!")');
});
