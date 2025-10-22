/**
 * Tooltip.js - Tooltip Component for Node Hover
 * Displays node information on hover with smooth animations
 */

class Tooltip {
    constructor() {
        this.tooltip = null;
        this.currentNode = null;
        this.hideTimeout = null;
        this.showDelay = 300; // ms before showing tooltip
        this.hideDelay = 200; // ms before hiding tooltip
        this.offset = 15; // px from cursor

        this.createTooltip();
        this.setupEventListeners();
    }

    /**
     * Create tooltip DOM element
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'node-tooltip hidden';
        this.tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="tooltip-type-badge"></div>
                <div class="tooltip-timestamp"></div>
            </div>
            <div class="tooltip-title"></div>
            <div class="tooltip-content"></div>
            <div class="tooltip-metadata"></div>
            <div class="tooltip-hint">Click for details</div>
        `;
        document.body.appendChild(this.tooltip);
    }

    /**
     * Setup event listeners for touch support
     */
    setupEventListeners() {
        // Touch support for mobile
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.node')) {
                const node = e.target.closest('.node');
                const nodeId = node.getAttribute('data-node-id');

                // Show tooltip on long press
                this.longPressTimer = setTimeout(() => {
                    const nodeData = this.getNodeData(nodeId);
                    if (nodeData) {
                        this.showForNode(nodeData, e.touches[0].clientX, e.touches[0].clientY);
                    }
                }, 500); // 500ms long press
            }
        });

        document.addEventListener('touchmove', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
            }
            this.hide();
        });

        document.addEventListener('touchend', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
            }
        });
    }

    /**
     * Show tooltip for a node
     */
    show(node, event) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        this.currentNode = node;

        // Get node details
        const title = this.getNodeTitle(node);
        const content = this.formatContent(node.content || '');
        const timestamp = this.formatTimestamp(node.timestamp);
        const metadata = this.getMetadata(node);

        // Update tooltip content
        const typeBadge = this.tooltip.querySelector('.tooltip-type-badge');
        typeBadge.textContent = node.type.toUpperCase();
        typeBadge.className = `tooltip-type-badge tooltip-type-${node.type}`;

        this.tooltip.querySelector('.tooltip-timestamp').textContent = timestamp;
        this.tooltip.querySelector('.tooltip-title').textContent = title;
        this.tooltip.querySelector('.tooltip-content').innerHTML = content;
        this.tooltip.querySelector('.tooltip-metadata').innerHTML = metadata;

        // Position tooltip
        this.position(event.clientX, event.clientY);

        // Show with animation
        this.tooltip.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.tooltip.classList.add('visible');
        });
    }

    /**
     * Show tooltip for a specific node data (for touch events)
     */
    showForNode(nodeData, x, y) {
        this.currentNode = nodeData;

        const title = this.getNodeTitle(nodeData);
        const content = this.formatContent(nodeData.content || '');
        const timestamp = this.formatTimestamp(nodeData.timestamp);
        const metadata = this.getMetadata(nodeData);

        const typeBadge = this.tooltip.querySelector('.tooltip-type-badge');
        typeBadge.textContent = nodeData.type.toUpperCase();
        typeBadge.className = `tooltip-type-badge tooltip-type-${nodeData.type}`;

        this.tooltip.querySelector('.tooltip-timestamp').textContent = timestamp;
        this.tooltip.querySelector('.tooltip-title').textContent = title;
        this.tooltip.querySelector('.tooltip-content').innerHTML = content;
        this.tooltip.querySelector('.tooltip-metadata').innerHTML = metadata;

        this.position(x, y);

        this.tooltip.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.tooltip.classList.add('visible');
        });
    }

    /**
     * Hide tooltip
     */
    hide() {
        this.hideTimeout = setTimeout(() => {
            this.tooltip.classList.remove('visible');
            setTimeout(() => {
                this.tooltip.classList.add('hidden');
                this.currentNode = null;
            }, 200); // Match CSS transition time
        }, this.hideDelay);
    }

    /**
     * Position tooltip relative to cursor
     */
    position(x, y) {
        const rect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + this.offset;
        let top = y + this.offset;

        // Adjust if tooltip goes off right edge
        if (left + rect.width > viewportWidth - 10) {
            left = x - rect.width - this.offset;
        }

        // Adjust if tooltip goes off bottom edge
        if (top + rect.height > viewportHeight - 10) {
            top = y - rect.height - this.offset;
        }

        // Ensure tooltip doesn't go off left edge
        if (left < 10) {
            left = 10;
        }

        // Ensure tooltip doesn't go off top edge
        if (top < 10) {
            top = 10;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /**
     * Update tooltip position (for mouse move)
     */
    updatePosition(x, y) {
        if (!this.tooltip.classList.contains('hidden')) {
            this.position(x, y);
        }
    }

    /**
     * Get node title
     */
    getNodeTitle(node) {
        if (node.title) return node.title;
        if (node.type === 'input') return 'User Input';
        if (node.type === 'output') return 'Assistant Output';
        if (node.type === 'skill') return node.skill_name || 'Skill Execution';
        if (node.type === 'auto') return node.detected_type || 'Auto-detected';
        return 'Node';
    }

    /**
     * Format content with line breaks and code blocks
     */
    formatContent(content) {
        if (!content) return '<em class="text-gray-500">No content</em>';

        // Truncate long content
        let displayContent = content.length > 300 ? content.substring(0, 300) + '...' : content;

        // Escape HTML
        displayContent = this.escapeHtml(displayContent);

        // Format code blocks (simple detection)
        displayContent = displayContent.replace(/`([^`]+)`/g, '<code class="tooltip-code">$1</code>');

        // Preserve line breaks
        displayContent = displayContent.replace(/\n/g, '<br>');

        return displayContent;
    }

    /**
     * Format timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'No timestamp';

        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

            return date.toLocaleDateString();
        } catch (e) {
            return 'Invalid date';
        }
    }

    /**
     * Get metadata HTML
     */
    getMetadata(node) {
        const parts = [];

        if (node.skill_name) {
            parts.push(`<span class="tooltip-meta-item"><strong>Skill:</strong> ${this.escapeHtml(node.skill_name)}</span>`);
        }

        if (node.detected_type) {
            parts.push(`<span class="tooltip-meta-item"><strong>Type:</strong> ${this.escapeHtml(node.detected_type)}</span>`);
        }

        if (node.parent_id) {
            parts.push(`<span class="tooltip-meta-item"><strong>Parent:</strong> ${this.escapeHtml(node.parent_id.substring(0, 8))}</span>`);
        }

        if (node.id) {
            parts.push(`<span class="tooltip-meta-item"><strong>ID:</strong> ${this.escapeHtml(node.id.substring(0, 8))}</span>`);
        }

        return parts.length > 0 ? parts.join('') : '';
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
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy tooltip
     */
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        this.tooltip = null;
        this.currentNode = null;
    }
}

// Export for use in other modules
window.Tooltip = Tooltip;
