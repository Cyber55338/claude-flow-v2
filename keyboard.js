/**
 * Keyboard Shortcuts Handler
 */

class KeyboardManager {
    constructor(canvas, minimap, search, perfMonitor = null, perfTestUI = null) {
        this.canvas = canvas;
        this.minimap = minimap;
        this.search = search;
        this.perfMonitor = perfMonitor;
        this.perfTestUI = perfTestUI;
        this.setupListeners();
        this.showHelp = false;
        this.createHelpOverlay();
    }

    /**
     * Setup keyboard event listeners
     */
    setupListeners() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input field
            if (e.target.tagName === 'INPUT' && e.target.id !== 'search-input') {
                return;
            }

            // Ctrl/Cmd + F: Search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.search.focus();
                return;
            }

            // Don't handle other shortcuts when typing in search
            if (e.target.id === 'search-input') {
                return;
            }

            // Handle shortcuts
            switch (e.key.toLowerCase()) {
                case ' ':
                    // Space: Toggle minimap
                    e.preventDefault();
                    this.minimap.toggle();
                    break;

                case 'f':
                    // F: Focus/fit all nodes
                    e.preventDefault();
                    this.canvas.focusAll();
                    break;

                case 'r':
                    // R: Reset zoom
                    e.preventDefault();
                    this.canvas.resetView();
                    break;

                case '+':
                case '=':
                    // +: Zoom in
                    e.preventDefault();
                    this.canvas.zoomIn();
                    break;

                case '-':
                case '_':
                    // -: Zoom out
                    e.preventDefault();
                    this.canvas.zoomOut();
                    break;

                case '?':
                case '/':
                    // ?: Show help
                    if (e.shiftKey || e.key === '?') {
                        e.preventDefault();
                        this.toggleHelp();
                    }
                    break;

                case 'escape':
                    // Escape: Clear search or close help
                    if (this.showHelp) {
                        this.toggleHelp();
                    } else {
                        this.search.clear();
                    }
                    break;

                case 'l':
                    // L: Toggle layout
                    e.preventDefault();
                    this.canvas.toggleLayout();
                    break;

                case 'm':
                    // M: Toggle minimap
                    e.preventDefault();
                    this.minimap.toggle();
                    break;

                case 'p':
                    // P: Toggle performance monitor
                    if (this.perfMonitor) {
                        e.preventDefault();
                        this.perfMonitor.toggle();
                    }
                    break;

                case 't':
                    // T: Toggle performance test UI
                    if (this.perfTestUI) {
                        e.preventDefault();
                        this.perfTestUI.toggle();
                    }
                    break;
            }
        });
    }

    /**
     * Create help overlay
     */
    createHelpOverlay() {
        this.helpOverlay = document.createElement('div');
        this.helpOverlay.className = 'keyboard-help';
        this.helpOverlay.style.display = 'none';
        this.helpOverlay.innerHTML = `
            <div class="help-content">
                <h3>Keyboard Shortcuts</h3>
                <div class="help-grid">
                    <div class="help-item">
                        <kbd>Space</kbd>
                        <span>Toggle Minimap</span>
                    </div>
                    <div class="help-item">
                        <kbd>F</kbd>
                        <span>Focus All Nodes</span>
                    </div>
                    <div class="help-item">
                        <kbd>R</kbd>
                        <span>Reset Zoom</span>
                    </div>
                    <div class="help-item">
                        <kbd>L</kbd>
                        <span>Toggle Layout Mode</span>
                    </div>
                    <div class="help-item">
                        <kbd>M</kbd>
                        <span>Toggle Minimap</span>
                    </div>
                    <div class="help-item">
                        <kbd>Ctrl/Cmd + F</kbd>
                        <span>Search Nodes</span>
                    </div>
                    <div class="help-item">
                        <kbd>+</kbd>
                        <span>Zoom In</span>
                    </div>
                    <div class="help-item">
                        <kbd>-</kbd>
                        <span>Zoom Out</span>
                    </div>
                    <div class="help-item">
                        <kbd>Esc</kbd>
                        <span>Clear Search / Close Help</span>
                    </div>
                    <div class="help-item">
                        <kbd>?</kbd>
                        <span>Toggle This Help</span>
                    </div>
                </div>
                <p class="help-tip">Click anywhere or press <kbd>?</kbd> to close</p>
            </div>
        `;

        // Close on click
        this.helpOverlay.addEventListener('click', () => {
            this.toggleHelp();
        });

        document.body.appendChild(this.helpOverlay);
    }

    /**
     * Toggle help overlay
     */
    toggleHelp() {
        this.showHelp = !this.showHelp;
        this.helpOverlay.style.display = this.showHelp ? 'flex' : 'none';
    }
}

window.KeyboardManager = KeyboardManager;
