/**
 * Canvas.js - SVG Node Rendering and Canvas Management
 */

class Canvas {
    constructor(svgElement) {
        this.svg = svgElement;
        this.canvasGroup = document.getElementById('canvas-group');
        this.nodesGroup = document.getElementById('nodes-group');
        this.edgesGroup = document.getElementById('edges-group');
        this.emptyState = document.getElementById('empty-state');

        // Zoom and Pan state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        // Layout configuration
        this.config = {
            verticalSpacing: 150,
            horizontalSpacing: 220,
            nodeWidth: 180,
            nodeHeight: 100,
            startX: 400,
            startY: 50
        };

        this.setupControls();
        this.setupZoomPan();
    }

    /**
     * Setup zoom/pan controls
     */
    setupControls() {
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-reset').addEventListener('click', () => this.resetZoom());
        document.getElementById('clear-canvas').addEventListener('click', () => this.clear());
    }

    /**
     * Setup zoom and pan interactions
     */
    setupZoomPan() {
        // Mouse wheel zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= delta;
            this.zoom = Math.max(0.1, Math.min(5, this.zoom)); // Clamp between 0.1 and 5
            this.updateTransform();
        });

        // Pan (drag)
        let isDragging = false;
        let startX, startY;

        this.svg.addEventListener('mousedown', (e) => {
            if (e.target === this.svg || e.target === this.canvasGroup) {
                isDragging = true;
                startX = e.clientX - this.panX;
                startY = e.clientY - this.panY;
                this.svg.style.cursor = 'grabbing';
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.panX = e.clientX - startX;
                this.panY = e.clientY - startY;
                this.updateTransform();
            }
        });

        this.svg.addEventListener('mouseup', () => {
            isDragging = false;
            this.svg.style.cursor = 'grab';
        });

        this.svg.addEventListener('mouseleave', () => {
            isDragging = false;
            this.svg.style.cursor = 'grab';
        });
    }

    /**
     * Update SVG transform
     */
    updateTransform() {
        this.canvasGroup.setAttribute('transform',
            `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }

    /**
     * Zoom controls
     */
    zoomIn() {
        this.zoom *= 1.2;
        this.zoom = Math.min(5, this.zoom);
        this.updateTransform();
    }

    zoomOut() {
        this.zoom *= 0.8;
        this.zoom = Math.max(0.1, this.zoom);
        this.updateTransform();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
    }

    /**
     * Clear canvas
     */
    clear() {
        this.nodesGroup.innerHTML = '';
        this.edgesGroup.innerHTML = '';
        this.emptyState.style.display = 'block';
        this.updateNodeCount(0);
    }

    /**
     * Render complete flow data
     */
    render(data) {
        if (!data || !data.nodes || data.nodes.length === 0) {
            this.emptyState.style.display = 'block';
            this.currentData = {
                conversation_id: null,
                created_at: new Date().toISOString(),
                nodes: [],
                edges: []
            };
            return;
        }

        this.emptyState.style.display = 'none';

        // Store current data
        this.currentData = data;

        // Clear existing
        this.nodesGroup.innerHTML = '';
        this.edgesGroup.innerHTML = '';

        // Calculate layout positions
        const nodesWithPositions = this.calculateLayout(data.nodes);

        // Render edges first (so they appear behind nodes)
        if (data.edges) {
            data.edges.forEach(edge => {
                const fromNode = nodesWithPositions.find(n => n.id === edge.from);
                const toNode = nodesWithPositions.find(n => n.id === edge.to);
                if (fromNode && toNode) {
                    this.renderEdge(fromNode, toNode);
                }
            });
        }

        // Render nodes
        nodesWithPositions.forEach(node => {
            this.renderNode(node);
        });

        // Update node count
        this.updateNodeCount(data.nodes.length);
    }

    /**
     * Get current flow data
     */
    getData() {
        return this.currentData || {
            conversation_id: null,
            created_at: new Date().toISOString(),
            nodes: [],
            edges: []
        };
    }

    /**
     * Calculate node layout positions
     */
    calculateLayout(nodes) {
        const nodesWithPositions = JSON.parse(JSON.stringify(nodes));
        let currentY = this.config.startY;

        // Group nodes by parent
        const nodesByParent = {};
        nodesWithPositions.forEach(node => {
            const parent = node.parent_id || 'root';
            if (!nodesByParent[parent]) {
                nodesByParent[parent] = [];
            }
            nodesByParent[parent].push(node);
        });

        // Layout algorithm
        nodesWithPositions.forEach((node, index) => {
            if (node.type === 'input') {
                // Input nodes centered
                node.x = this.config.startX;
                node.y = currentY;
                currentY += this.config.verticalSpacing;
            } else if (node.type === 'skill') {
                // Skill nodes spread horizontally
                const siblings = nodesByParent[node.parent_id] || [];
                const skillSiblings = siblings.filter(n => n.type === 'skill');
                const skillIndex = skillSiblings.findIndex(n => n.id === node.id);
                const totalWidth = skillSiblings.length * this.config.horizontalSpacing;
                const startX = this.config.startX - totalWidth / 2 + this.config.horizontalSpacing / 2;

                node.x = startX + (skillIndex * this.config.horizontalSpacing);
                node.y = currentY;
            } else if (node.type === 'auto') {
                // Auto-detected nodes slightly offset
                node.x = this.config.startX + 100;
                node.y = currentY;
            } else {
                // Output and other nodes centered
                node.x = this.config.startX;
                node.y = currentY;
            }

            // Move Y for next node (only for non-skill or last skill in group)
            const siblings = nodesByParent[node.parent_id] || [];
            const skillSiblings = siblings.filter(n => n.type === 'skill');
            if (node.type !== 'skill' || skillSiblings[skillSiblings.length - 1].id === node.id) {
                currentY += this.config.verticalSpacing;
            }
        });

        return nodesWithPositions;
    }

    /**
     * Render a single node
     */
    renderNode(node) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node');
        g.setAttribute('data-node-id', node.id);
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        // Background rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', this.config.nodeWidth);
        rect.setAttribute('height', this.config.nodeHeight);
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', this.getNodeFill(node.type));
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '2');

        // Title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('class', 'node-title');
        title.setAttribute('x', '10');
        title.setAttribute('y', '25');
        title.setAttribute('font-size', '14');
        title.setAttribute('font-weight', 'bold');
        title.textContent = this.truncate(this.getNodeTitle(node), 20);

        // Content (wrapped text)
        const contentText = this.truncate(node.content || '', 80);
        const contentLines = this.wrapText(contentText, 22);

        contentLines.forEach((line, i) => {
            const content = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            content.setAttribute('class', 'node-content');
            content.setAttribute('x', '10');
            content.setAttribute('y', 45 + (i * 16));
            content.setAttribute('font-size', '11');
            content.textContent = line;
            g.appendChild(content);
        });

        // Node click handler - removed, now handled by interactions.js
        // g.addEventListener('click', () => {
        //     this.onNodeClick(node);
        // });

        g.appendChild(rect);
        g.appendChild(title);

        this.nodesGroup.appendChild(g);
    }

    /**
     * Render an edge between two nodes
     */
    renderEdge(fromNode, toNode) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'edge');

        // Calculate connection points
        const fromX = fromNode.x + this.config.nodeWidth / 2;
        const fromY = fromNode.y + this.config.nodeHeight;
        const toX = toNode.x + this.config.nodeWidth / 2;
        const toY = toNode.y;

        // Create curved path
        const midY = (fromY + toY) / 2;
        const d = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;

        path.setAttribute('d', d);

        this.edgesGroup.appendChild(path);
    }

    /**
     * Get node fill color/gradient
     */
    getNodeFill(type) {
        const fills = {
            'input': 'url(#inputGradient)',
            'output': 'url(#outputGradient)',
            'skill': 'url(#skillGradient)',
            'auto': 'url(#autoGradient)'
        };
        return fills[type] || '#666';
    }

    /**
     * Get node title
     */
    getNodeTitle(node) {
        if (node.title) return node.title;
        if (node.type === 'input') return 'Input';
        if (node.type === 'output') return 'Output';
        if (node.type === 'skill') return node.skill_name || 'Skill';
        if (node.type === 'auto') return node.detected_type || 'Auto';
        return 'Node';
    }

    /**
     * Truncate text
     */
    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Wrap text into lines
     */
    wrapText(text, maxChars) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length <= maxChars) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });

        if (currentLine) lines.push(currentLine);
        return lines.slice(0, 3); // Max 3 lines
    }

    /**
     * Node click handler (deprecated - now handled by interactions.js)
     */
    onNodeClick(node) {
        console.log('Node clicked:', node);
        // Handled by interactions.js
    }

    /**
     * Update node count display
     */
    updateNodeCount(count) {
        const nodeCountEl = document.getElementById('node-count');
        nodeCountEl.textContent = `${count} node${count !== 1 ? 's' : ''}`;
    }
}

// Export for use in app.js
window.Canvas = Canvas;
