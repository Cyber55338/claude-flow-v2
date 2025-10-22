/**
 * ContextMenu.js - Context Menu Component for Node Actions
 * Right-click menu with various node actions
 */

class ContextMenu {
    constructor() {
        this.menu = null;
        this.currentNode = null;
        this.isOpen = false;

        this.createMenu();
        this.setupEventListeners();
    }

    /**
     * Create context menu DOM element
     */
    createMenu() {
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu hidden';
        this.menu.innerHTML = `
            <div class="context-menu-item" data-action="view">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>View Details</span>
            </div>
            <div class="context-menu-item" data-action="copy">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Content</span>
            </div>
            <div class="context-menu-item" data-action="export">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export Node</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="connections">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>View Connections</span>
            </div>
            <div class="context-menu-item" data-action="focus">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                <span>Focus Node</span>
            </div>
            <div class="context-menu-item" data-action="highlight">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Highlight Connected</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="select">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Select Node</span>
            </div>
        `;
        document.body.appendChild(this.menu);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Click on menu items
        this.menu.querySelectorAll('[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleAction(action);
                this.hide();
            });
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.menu.contains(e.target)) {
                this.hide();
            }
        });

        // Prevent default context menu on nodes
        document.addEventListener('contextmenu', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                e.preventDefault();
            }
        });

        // Close on scroll
        window.addEventListener('scroll', () => {
            if (this.isOpen) {
                this.hide();
            }
        });

        // Long press for mobile
        let longPressTimer = null;
        document.addEventListener('touchstart', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                longPressTimer = setTimeout(() => {
                    const nodeId = nodeElement.getAttribute('data-node-id');
                    const nodeData = this.getNodeData(nodeId);
                    if (nodeData) {
                        const touch = e.touches[0];
                        this.show(nodeData, touch.clientX, touch.clientY);
                    }
                }, 500); // 500ms long press
            }
        });

        document.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }
        });

        document.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }
        });
    }

    /**
     * Show context menu
     */
    show(node, x, y) {
        this.currentNode = node;
        this.isOpen = true;

        // Position menu
        this.position(x, y);

        // Show menu
        this.menu.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.menu.classList.add('visible');
        });
    }

    /**
     * Hide context menu
     */
    hide() {
        this.menu.classList.remove('visible');

        setTimeout(() => {
            this.menu.classList.add('hidden');
            this.isOpen = false;
        }, 150); // Match CSS transition
    }

    /**
     * Position menu
     */
    position(x, y) {
        const rect = this.menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x;
        let top = y;

        // Adjust if menu goes off right edge
        if (left + rect.width > viewportWidth - 10) {
            left = x - rect.width;
        }

        // Adjust if menu goes off bottom edge
        if (top + rect.height > viewportHeight - 10) {
            top = y - rect.height;
        }

        // Ensure menu doesn't go off left edge
        if (left < 10) {
            left = 10;
        }

        // Ensure menu doesn't go off top edge
        if (top < 10) {
            top = 10;
        }

        this.menu.style.left = `${left}px`;
        this.menu.style.top = `${top}px`;
    }

    /**
     * Handle action
     */
    handleAction(action) {
        if (!this.currentNode) return;

        switch (action) {
            case 'view':
                this.viewDetails();
                break;
            case 'copy':
                this.copyContent();
                break;
            case 'export':
                this.exportNode();
                break;
            case 'connections':
                this.viewConnections();
                break;
            case 'focus':
                this.focusNode();
                break;
            case 'highlight':
                this.highlightConnected();
                break;
            case 'select':
                this.selectNode();
                break;
        }
    }

    /**
     * View node details (open modal)
     */
    viewDetails() {
        if (window.interactions && window.interactions.modal) {
            window.interactions.modal.open(this.currentNode);
        }
    }

    /**
     * Copy content to clipboard
     */
    async copyContent() {
        if (!this.currentNode || !this.currentNode.content) return;

        try {
            await navigator.clipboard.writeText(this.currentNode.content);
            if (window.ui) {
                window.ui.success('Copied', 'Content copied to clipboard');
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            if (window.ui) {
                window.ui.error('Copy Failed', 'Could not copy to clipboard');
            }
        }
    }

    /**
     * Export node as JSON
     */
    exportNode() {
        if (!this.currentNode) return;

        const json = JSON.stringify(this.currentNode, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `node-${this.currentNode.id.substring(0, 8)}.json`;
        a.click();

        URL.revokeObjectURL(url);

        if (window.ui) {
            window.ui.success('Exported', 'Node exported as JSON');
        }
    }

    /**
     * View connections (highlight and show info)
     */
    viewConnections() {
        if (window.interactions) {
            window.interactions.highlightConnections(this.currentNode.id);

            // Show connection info
            const connections = this.getConnections(this.currentNode);
            if (window.ui) {
                window.ui.info(
                    'Connections',
                    `${connections.children.length} children, ${connections.parent ? '1 parent' : 'no parent'}`
                );
            }
        }
    }

    /**
     * Focus on node (center and zoom)
     */
    focusNode() {
        if (window.interactions) {
            window.interactions.focusNode(this.currentNode.id);
        }
    }

    /**
     * Highlight connected nodes
     */
    highlightConnected() {
        if (window.interactions) {
            window.interactions.highlightConnections(this.currentNode.id);
        }
    }

    /**
     * Select node
     */
    selectNode() {
        if (window.interactions) {
            window.interactions.selectNode(this.currentNode.id);
        }
    }

    /**
     * Get node data by ID
     */
    getNodeData(nodeId) {
        if (!window.app || !window.app.canvas) return null;

        const data = window.app.canvas.getData();
        if (!data || !data.nodes) return null;

        return data.nodes.find(n => n.id === nodeId);
    }

    /**
     * Get node connections
     */
    getConnections(node) {
        if (!window.app || !window.app.canvas) return { parent: null, children: [] };

        const data = window.app.canvas.getData();
        if (!data || !data.nodes) return { parent: null, children: [] };

        const parent = node.parent_id ? data.nodes.find(n => n.id === node.parent_id) : null;
        const children = data.nodes.filter(n => n.parent_id === node.id);

        return { parent, children };
    }

    /**
     * Destroy context menu
     */
    destroy() {
        if (this.menu && this.menu.parentNode) {
            this.menu.parentNode.removeChild(this.menu);
        }
        this.menu = null;
        this.currentNode = null;
        this.isOpen = false;
    }
}

// Export
window.ContextMenu = ContextMenu;
