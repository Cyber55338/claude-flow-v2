/**
 * Minimap Component - Overview navigation
 */

class MinimapManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.visible = false;
        this.minimapScale = 0.1;
        this.create();
        this.setupListeners();
    }

    /**
     * Create minimap element
     */
    create() {
        // Create minimap container
        this.container = document.createElement('div');
        this.container.id = 'minimap';
        this.container.className = 'minimap';
        this.container.style.display = 'none';

        // Create SVG for minimap
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '200');
        this.svg.setAttribute('height', '150');

        // Create groups
        this.nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.nodesGroup.setAttribute('id', 'minimap-nodes');
        this.svg.appendChild(this.nodesGroup);

        // Create viewport indicator
        this.viewport = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.viewport.setAttribute('class', 'minimap-viewport');
        this.viewport.setAttribute('fill', 'none');
        this.viewport.setAttribute('stroke', '#4CAF50');
        this.viewport.setAttribute('stroke-width', '2');
        this.svg.appendChild(this.viewport);

        this.container.appendChild(this.svg);

        // Add to canvas panel
        const canvasPanel = document.querySelector('.canvas-panel');
        canvasPanel.appendChild(this.container);

        // Click to navigate
        this.svg.addEventListener('click', (e) => this.onMinimapClick(e));
    }

    /**
     * Setup event listeners
     */
    setupListeners() {
        // Listen for zoom/pan changes
        if (this.canvas.svg) {
            const svgNode = this.canvas.svg.node();
            new MutationObserver(() => this.updateViewport())
                .observe(svgNode.querySelector('#canvas-group'), {
                    attributes: true,
                    attributeFilter: ['transform']
                });
        }
    }

    /**
     * Toggle minimap visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
        if (this.visible) {
            this.update();
        }
    }

    /**
     * Show minimap
     */
    show() {
        this.visible = true;
        this.container.style.display = 'block';
        this.update();
    }

    /**
     * Hide minimap
     */
    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }

    /**
     * Update minimap content
     */
    update() {
        if (!this.visible) return;
        if (!this.canvas.nodes || this.canvas.nodes.length === 0) return;

        // Clear existing nodes
        this.nodesGroup.innerHTML = '';

        // Calculate bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.canvas.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + this.canvas.config.nodeWidth);
            maxY = Math.max(maxY, node.y + this.canvas.config.nodeHeight);
        });

        const padding = 20;
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;

        // Calculate scale to fit
        const scaleX = 200 / width;
        const scaleY = 150 / height;
        this.minimapScale = Math.min(scaleX, scaleY);

        // Render nodes
        this.canvas.nodes.forEach(node => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const x = (node.x - minX + padding) * this.minimapScale;
            const y = (node.y - minY + padding) * this.minimapScale;
            const w = this.canvas.config.nodeWidth * this.minimapScale;
            const h = this.canvas.config.nodeHeight * this.minimapScale;

            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', w);
            rect.setAttribute('height', h);
            rect.setAttribute('fill', this.getNodeColor(node.type));
            rect.setAttribute('stroke', '#fff');
            rect.setAttribute('stroke-width', '0.5');
            rect.setAttribute('rx', '2');

            this.nodesGroup.appendChild(rect);
        });

        // Store bounds for viewport calculation
        this.bounds = { minX, minY, maxX, maxY, padding };

        // Update viewport
        this.updateViewport();
    }

    /**
     * Update viewport indicator
     */
    updateViewport() {
        if (!this.visible || !this.bounds) return;

        // Get current transform
        const canvasGroup = document.getElementById('canvas-group');
        const transform = canvasGroup.getAttribute('transform');

        if (!transform) return;

        // Parse transform
        const match = transform.match(/translate\(([^,]+),([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!match) return;

        const panX = parseFloat(match[1]);
        const panY = parseFloat(match[2]);
        const scale = parseFloat(match[3]);

        // Calculate viewport in canvas coordinates
        const svgRect = this.canvas.svg.node().getBoundingClientRect();
        const viewWidth = svgRect.width / scale;
        const viewHeight = svgRect.height / scale;
        const viewX = -panX / scale;
        const viewY = -panY / scale;

        // Transform to minimap coordinates
        const { minX, minY, padding } = this.bounds;
        const x = (viewX - minX + padding) * this.minimapScale;
        const y = (viewY - minY + padding) * this.minimapScale;
        const w = viewWidth * this.minimapScale;
        const h = viewHeight * this.minimapScale;

        this.viewport.setAttribute('x', x);
        this.viewport.setAttribute('y', y);
        this.viewport.setAttribute('width', w);
        this.viewport.setAttribute('height', h);
    }

    /**
     * Handle minimap click
     */
    onMinimapClick(e) {
        if (!this.bounds) return;

        const rect = this.svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert to canvas coordinates
        const { minX, minY, padding } = this.bounds;
        const canvasX = (x / this.minimapScale) + minX - padding;
        const canvasY = (y / this.minimapScale) + minY - padding;

        // Center view on this point
        const svgRect = this.canvas.svg.node().getBoundingClientRect();
        const currentTransform = d3.zoomTransform(this.canvas.svg.node());

        const transform = d3.zoomIdentity
            .translate(svgRect.width / 2, svgRect.height / 2)
            .scale(currentTransform.k)
            .translate(-canvasX, -canvasY);

        this.canvas.svg.transition().duration(500)
            .call(this.canvas.zoom.transform, transform);
    }

    /**
     * Get node color
     */
    getNodeColor(type) {
        const colors = {
            'input': '#4CAF50',
            'output': '#2196F3',
            'skill': '#FF9800',
            'auto': '#9C27B0'
        };
        return colors[type] || '#666';
    }
}

window.MinimapManager = MinimapManager;
