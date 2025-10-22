/**
 * App V2 - Main Application Logic with D3.js Integration
 */

class App {
    constructor() {
        this.dataFile = 'flow_data.json';
        this.pollInterval = 2000; // 2 seconds
        this.lastModified = null;

        // Initialize components
        this.initializeCanvas();
        this.initializePerformance();
        this.initializeMinimap();
        this.initializeSearch();
        this.initializeKeyboard();

        // Start polling
        this.startPolling();

        console.log('Claude Flow V2 initialized with D3.js and Performance Optimizations');
    }

    /**
     * Initialize Canvas V2
     */
    initializeCanvas() {
        const svgElement = document.getElementById('canvas');
        this.canvas = new CanvasV2(svgElement);
        window.canvas = this.canvas; // Make globally available
    }

    /**
     * Initialize Minimap
     */
    initializeMinimap() {
        this.minimap = new MinimapManager(this.canvas);
        window.minimapManager = this.minimap;
    }

    /**
     * Initialize Performance Monitoring
     */
    initializePerformance() {
        // Initialize performance monitor
        if (this.canvas.perfEngine && window.PerformanceMonitor) {
            this.perfMonitor = new PerformanceMonitor(this.canvas.perfEngine);
            window.perfMonitor = this.perfMonitor;
            console.log('Performance monitor initialized');
        }

        // Initialize performance test UI
        if (this.canvas.perfEngine && window.PerformanceTestUI) {
            this.perfTestUI = new PerformanceTestUI(this.canvas, this.canvas.perfEngine);
            window.perfTestUI = this.perfTestUI;
            console.log('Performance test UI initialized');
        }
    }

    /**
     * Initialize Search
     */
    initializeSearch() {
        this.search = new SearchManager(this.canvas);
        window.searchManager = this.search;
    }

    /**
     * Initialize Keyboard Shortcuts
     */
    initializeKeyboard() {
        this.keyboard = new KeyboardManager(
            this.canvas,
            this.minimap,
            this.search,
            this.perfMonitor,
            this.perfTestUI
        );
    }

    /**
     * Start polling for data updates
     */
    startPolling() {
        this.updateData();
        setInterval(() => this.updateData(), this.pollInterval);
    }

    /**
     * Update data from JSON file
     */
    async updateData() {
        try {
            const response = await fetch(this.dataFile + '?t=' + Date.now());

            if (!response.ok) {
                if (response.status === 404) {
                    // File not found - expected on first run
                    this.updateStatus('Waiting for data...', false);
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            // Check if file has been modified
            const lastModified = response.headers.get('Last-Modified');
            if (lastModified === this.lastModified) {
                return; // No changes
            }

            this.lastModified = lastModified;

            // Parse data
            const data = await response.json();

            // Validate data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            // Render
            this.render(data);

            // Update status
            this.updateStatus('Data loaded', true);
            this.updateLastUpdate();

        } catch (error) {
            console.error('Error loading data:', error);
            this.updateStatus('Error: ' + error.message, false);
        }
    }

    /**
     * Render data to canvas
     */
    render(data) {
        this.canvas.render(data);
    }

    /**
     * Update status message
     */
    updateStatus(message, success = true) {
        const statusEl = document.getElementById('status');
        const terminalStatus = document.getElementById('terminal-status');

        if (statusEl) {
            statusEl.textContent = message;
            if (success) {
                statusEl.classList.remove('text-red-400');
                statusEl.classList.add('text-gray-400');
            } else {
                statusEl.classList.remove('text-gray-400');
                statusEl.classList.add('text-red-400');
            }
        }

        if (terminalStatus) {
            const statusText = terminalStatus.querySelector('span:last-child') || terminalStatus;
            if (success) {
                statusText.textContent = 'Ready';
                terminalStatus.classList.remove('status-badge-error');
                terminalStatus.classList.add('status-badge-success');
            } else {
                statusText.textContent = 'Error';
                terminalStatus.classList.remove('status-badge-success');
                terminalStatus.classList.add('status-badge-error');
            }
        }
    }

    /**
     * Update last update timestamp
     */
    updateLastUpdate() {
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            const now = new Date();
            lastUpdateEl.textContent = `Last update: ${now.toLocaleTimeString()}`;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
