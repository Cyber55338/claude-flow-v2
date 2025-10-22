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

        // Separate terminal nodes from regular nodes
        const terminalNodes = nodesWithPositions.filter(n => n.type?.startsWith('terminal_'));
        const regularNodes = nodesWithPositions.filter(n => !n.type?.startsWith('terminal_'));

        // Layout terminal nodes sequentially first
        if (terminalNodes.length > 0) {
            // Sort by command_index
            terminalNodes.sort((a, b) => {
                const aIndex = a.metadata?.command_index || 0;
                const bIndex = b.metadata?.command_index || 0;
                return aIndex - bIndex;
            });

            terminalNodes.forEach((node) => {
                node.x = this.config.startX;
                node.y = currentY;

                // Different spacing based on node type
                if (node.type === 'terminal_input') {
                    currentY += 100; // Smaller gap between input and output
                } else if (node.type === 'terminal_output' || node.type === 'terminal_error') {
                    // Calculate height based on content
                    const lines = (node.content || '').split('\n').length;
                    const height = Math.min(120, 40 + lines * 16);
                    currentY += height + 50; // Larger gap before next command
                }
            });
        }

        // Layout regular nodes
        regularNodes.forEach((node, index) => {
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
        // Check for terminal node types and use specialized rendering
        if (node.type === 'terminal_input') {
            return this.renderTerminalInputNode(node);
        } else if (node.type === 'terminal_output') {
            return this.renderTerminalOutputNode(node);
        } else if (node.type === 'terminal_error') {
            return this.renderTerminalErrorNode(node);
        }

        // Regular node rendering
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

        g.appendChild(rect);
        g.appendChild(title);

        this.nodesGroup.appendChild(g);
    }

    /**
     * Render Terminal Input Node
     */
    renderTerminalInputNode(node) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node terminal-input');
        g.setAttribute('data-node-id', node.id);
        g.setAttribute('data-node-type', 'terminal_input');
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        // Background rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '200');
        rect.setAttribute('height', '80');
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', 'url(#terminalInputGradient)');
        rect.setAttribute('stroke', '#22c55e');
        rect.setAttribute('stroke-width', '2');
        g.appendChild(rect);

        // Status indicator
        const statusColor = {
            'pending': '#fbbf24',
            'executing': '#3b82f6',
            'complete': '#22c55e',
            'error': '#ef4444'
        }[node.metadata?.status || 'complete'];

        const statusCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        statusCircle.setAttribute('cx', '15');
        statusCircle.setAttribute('cy', '15');
        statusCircle.setAttribute('r', '5');
        statusCircle.setAttribute('fill', statusColor);
        g.appendChild(statusCircle);

        // Command text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '30');
        text.setAttribute('y', '20');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-family', "'Fira Code', 'Consolas', monospace");
        text.setAttribute('font-size', '13');
        text.setAttribute('font-weight', 'bold');
        text.textContent = `$ ${node.content.slice(0, 30)}`;
        g.appendChild(text);

        // Timestamp
        const timestamp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        timestamp.setAttribute('x', '10');
        timestamp.setAttribute('y', '65');
        timestamp.setAttribute('fill', '#9ca3af');
        timestamp.setAttribute('font-size', '10');
        timestamp.textContent = node.metadata?.timestamp ? new Date(node.metadata.timestamp).toLocaleTimeString() : '';
        g.appendChild(timestamp);

        // Command index
        const index = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        index.setAttribute('x', '180');
        index.setAttribute('y', '65');
        index.setAttribute('fill', '#9ca3af');
        index.setAttribute('font-size', '10');
        index.setAttribute('text-anchor', 'end');
        index.textContent = `#${node.metadata?.command_index ?? 0}`;
        g.appendChild(index);

        this.nodesGroup.appendChild(g);
    }

    /**
     * Render Terminal Output Node
     */
    renderTerminalOutputNode(node) {
        const lines = node.content.split('\n');
        const height = Math.min(120, 40 + lines.length * 16);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node terminal-output');
        g.setAttribute('data-node-id', node.id);
        g.setAttribute('data-node-type', 'terminal_output');
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        // Background rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '200');
        rect.setAttribute('height', height);
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', 'url(#terminalOutputGradient)');
        rect.setAttribute('stroke', '#06b6d4');
        rect.setAttribute('stroke-width', '2');
        g.appendChild(rect);

        // Success icon (checkmark)
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('d', 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
        iconPath.setAttribute('stroke', '#22c55e');
        iconPath.setAttribute('stroke-width', '2');
        iconPath.setAttribute('fill', 'none');
        iconPath.setAttribute('transform', 'translate(5, 5) scale(0.8)');
        g.appendChild(iconPath);

        // Output text (multiline)
        let yOffset = 25;
        lines.slice(0, 5).forEach((line) => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '30');
            text.setAttribute('y', yOffset);
            text.setAttribute('fill', '#e5e7eb');
            text.setAttribute('font-family', "'Fira Code', 'Consolas', monospace");
            text.setAttribute('font-size', '11');
            text.textContent = line.slice(0, 30);
            g.appendChild(text);
            yOffset += 16;
        });

        // Metadata
        const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        metadata.setAttribute('x', '10');
        metadata.setAttribute('y', height - 10);
        metadata.setAttribute('fill', '#9ca3af');
        metadata.setAttribute('font-size', '9');
        metadata.textContent = `exit: ${node.metadata?.exit_code ?? 0} | ${node.metadata?.duration_ms ?? 0}ms`;
        g.appendChild(metadata);

        this.nodesGroup.appendChild(g);
    }

    /**
     * Render Terminal Error Node
     */
    renderTerminalErrorNode(node) {
        const lines = node.content.split('\n');
        const height = Math.min(120, 40 + lines.length * 16);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node terminal-error');
        g.setAttribute('data-node-id', node.id);
        g.setAttribute('data-node-type', 'terminal_error');
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        // Background rectangle (red)
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '200');
        rect.setAttribute('height', height);
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', 'url(#terminalErrorGradient)');
        rect.setAttribute('stroke', '#ef4444');
        rect.setAttribute('stroke-width', '2');
        g.appendChild(rect);

        // Error icon (X)
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('d', 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z');
        iconPath.setAttribute('stroke', '#ef4444');
        iconPath.setAttribute('stroke-width', '2');
        iconPath.setAttribute('fill', 'none');
        iconPath.setAttribute('transform', 'translate(5, 5) scale(0.8)');
        g.appendChild(iconPath);

        // Error text (multiline, red-tinted)
        let yOffset = 25;
        lines.slice(0, 5).forEach((line) => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '30');
            text.setAttribute('y', yOffset);
            text.setAttribute('fill', '#fca5a5');
            text.setAttribute('font-family', "'Fira Code', 'Consolas', monospace");
            text.setAttribute('font-size', '11');
            text.setAttribute('font-weight', 'bold');
            text.textContent = line.slice(0, 30);
            g.appendChild(text);
            yOffset += 16;
        });

        // Metadata
        const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        metadata.setAttribute('x', '10');
        metadata.setAttribute('y', height - 10);
        metadata.setAttribute('fill', '#fca5a5');
        metadata.setAttribute('font-size', '9');
        metadata.textContent = `exit: ${node.metadata?.exit_code ?? 1} | ${node.metadata?.duration_ms ?? 0}ms`;
        g.appendChild(metadata);

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
            'auto': 'url(#autoGradient)',
            'terminal_input': 'url(#terminalInputGradient)',
            'terminal_output': 'url(#terminalOutputGradient)',
            'terminal_error': 'url(#terminalErrorGradient)'
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
