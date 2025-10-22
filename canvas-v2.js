/**
 * Canvas V2 - Advanced D3.js Force-Directed Layout with Performance Optimizations
 */

class CanvasV2 {
    constructor(svgElement) {
        this.svg = d3.select(svgElement);
        this.canvasGroup = this.svg.select('#canvas-group');
        this.nodesGroup = this.svg.select('#nodes-group');
        this.edgesGroup = this.svg.select('#edges-group');
        this.emptyState = document.getElementById('empty-state');

        // Layout mode: 'force' or 'hierarchical'
        this.layoutMode = 'force';

        // Canvas dimensions
        this.width = svgElement.clientWidth;
        this.height = svgElement.clientHeight;

        // Node configuration
        this.config = {
            nodeWidth: 180,
            nodeHeight: 100,
            nodeRadius: 8,
            collisionRadius: 120
        };

        // Data
        this.nodes = [];
        this.links = [];

        // D3 Force Simulation
        this.simulation = null;

        // Performance optimizations
        this.perfEngine = null;
        this.virtualCanvas = null;
        this.webWorkerLayout = null;
        this.useVirtualRendering = false;
        this.useWebWorker = false;

        // Current zoom transform
        this.currentTransform = d3.zoomIdentity;

        // Zoom behavior with throttling
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                this.onZoom(event);
            });

        this.svg.call(this.zoom);

        this.setupControls();
        this.initializePerformance();
        this.initializeSimulation();
    }

    /**
     * Setup controls and buttons
     */
    setupControls() {
        // Add layout toggle button
        const controls = document.querySelector('.controls');

        // Layout toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-layout';
        toggleBtn.textContent = 'Force Layout';
        toggleBtn.title = 'Toggle Layout Mode';
        toggleBtn.addEventListener('click', () => this.toggleLayout());
        controls.insertBefore(toggleBtn, controls.firstChild);

        // Existing controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-reset').addEventListener('click', () => this.resetView());
        document.getElementById('clear-canvas').addEventListener('click', () => this.clear());
    }

    /**
     * Initialize performance systems
     */
    initializePerformance() {
        // Initialize performance engine
        if (window.PerformanceEngine) {
            this.perfEngine = new PerformanceEngine();
            console.log('[Canvas] Performance engine initialized');
        }

        // Initialize virtual canvas
        if (window.VirtualCanvas) {
            this.virtualCanvas = new VirtualCanvas(this, this.perfEngine);
            console.log('[Canvas] Virtual canvas initialized');
        }

        // Initialize web worker layout (optional)
        if (window.WebWorkerLayout && false) { // Disabled by default
            try {
                this.webWorkerLayout = new WebWorkerLayout(this.width, this.height);
                console.log('[Canvas] Web worker layout initialized');
            } catch (error) {
                console.warn('[Canvas] Web worker not available:', error);
            }
        }
    }

    /**
     * Initialize D3 Force Simulation
     */
    initializeSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink()
                .id(d => d.id)
                .distance(150)
                .strength(0.5))
            .force('charge', d3.forceManyBody()
                .strength(-800)
                .distanceMax(400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide()
                .radius(this.config.collisionRadius)
                .strength(0.7))
            .force('x', d3.forceX(this.width / 2).strength(0.05))
            .force('y', d3.forceY(this.height / 2).strength(0.05))
            .alphaDecay(0.02)
            .velocityDecay(0.4);

        this.simulation.on('tick', () => this.onTick());
    }

    /**
     * Toggle between force and hierarchical layouts
     */
    toggleLayout() {
        this.layoutMode = this.layoutMode === 'force' ? 'hierarchical' : 'force';
        const btn = document.getElementById('toggle-layout');
        btn.textContent = this.layoutMode === 'force' ? 'Force Layout' : 'Hierarchical';

        if (this.nodes.length > 0) {
            this.applyLayout();
        }
    }

    /**
     * Apply current layout mode
     */
    applyLayout() {
        if (this.layoutMode === 'force') {
            // Restart simulation
            this.simulation.nodes(this.nodes);
            this.simulation.force('link').links(this.links);
            this.simulation.alpha(1).restart();
        } else {
            // Apply hierarchical layout
            this.simulation.stop();
            this.calculateHierarchicalLayout();
            this.updatePositions();
        }
    }

    /**
     * Calculate hierarchical layout positions
     */
    calculateHierarchicalLayout() {
        const verticalSpacing = 150;
        const horizontalSpacing = 220;
        const startX = this.width / 2;
        let currentY = 100;

        // Group by parent
        const nodesByParent = {};
        this.nodes.forEach(node => {
            const parent = node.parent_id || 'root';
            if (!nodesByParent[parent]) {
                nodesByParent[parent] = [];
            }
            nodesByParent[parent].push(node);
        });

        // Layout
        this.nodes.forEach(node => {
            if (node.type === 'input') {
                node.x = startX;
                node.y = currentY;
                currentY += verticalSpacing;
            } else if (node.type === 'skill') {
                const siblings = nodesByParent[node.parent_id] || [];
                const skillSiblings = siblings.filter(n => n.type === 'skill');
                const skillIndex = skillSiblings.findIndex(n => n.id === node.id);
                const totalWidth = skillSiblings.length * horizontalSpacing;
                const startXPos = startX - totalWidth / 2 + horizontalSpacing / 2;

                node.x = startXPos + (skillIndex * horizontalSpacing);
                node.y = currentY;
            } else {
                node.x = startX;
                node.y = currentY;
            }

            // Update Y position
            const siblings = nodesByParent[node.parent_id] || [];
            const skillSiblings = siblings.filter(n => n.type === 'skill');
            if (node.type !== 'skill' || skillSiblings[skillSiblings.length - 1].id === node.id) {
                currentY += verticalSpacing;
            }
        });
    }

    /**
     * Handle zoom events with throttling
     */
    onZoom(event) {
        const throttled = this.perfEngine
            ? this.perfEngine.throttle('zoom', () => {
                this.currentTransform = event.transform;
                this.canvasGroup.attr('transform', event.transform);

                // Update virtual canvas viewport
                if (this.virtualCanvas && this.useVirtualRendering) {
                    this.virtualCanvas.updateViewport(
                        event.transform,
                        this.width,
                        this.height
                    );
                    this.updateVisibleNodes();
                }
            })
            : () => {
                this.currentTransform = event.transform;
                this.canvasGroup.attr('transform', event.transform);
            };

        throttled();
    }

    /**
     * Simulation tick handler with performance optimization
     */
    onTick() {
        if (this.perfEngine) {
            this.perfEngine.raf(() => this.renderTick());
        } else {
            this.renderTick();
        }
    }

    /**
     * Render tick
     */
    renderTick() {
        // Get visible nodes if virtual rendering is enabled
        const nodesToRender = this.useVirtualRendering && this.virtualCanvas
            ? this.virtualCanvas.getVisibleNodes()
            : this.nodes;

        // Update link positions
        this.edgesGroup.selectAll('path')
            .attr('d', d => {
                const fromX = d.source.x + this.config.nodeWidth / 2;
                const fromY = d.source.y + this.config.nodeHeight;
                const toX = d.target.x + this.config.nodeWidth / 2;
                const toY = d.target.y;
                const midY = (fromY + toY) / 2;
                return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
            });

        // Update node positions
        this.nodesGroup.selectAll('g.node')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
    }

    /**
     * Update visible nodes (for virtual rendering)
     */
    updateVisibleNodes() {
        if (!this.useVirtualRendering || !this.virtualCanvas) return;

        const visibleNodes = this.virtualCanvas.getVisibleNodes();
        const visibleIds = new Set(visibleNodes.map(n => n.id));

        // Show/hide nodes based on visibility
        this.nodesGroup.selectAll('g.node')
            .style('display', d => visibleIds.has(d.id) ? 'block' : 'none');

        // Show/hide edges based on visibility
        this.edgesGroup.selectAll('path')
            .style('display', d => {
                return visibleIds.has(d.source.id) && visibleIds.has(d.target.id)
                    ? 'block'
                    : 'none';
            });
    }

    /**
     * Update positions (for hierarchical layout)
     */
    updatePositions() {
        // Smooth transition to new positions
        this.nodesGroup.selectAll('g.node')
            .transition()
            .duration(750)
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        this.edgesGroup.selectAll('path')
            .transition()
            .duration(750)
            .attr('d', d => {
                const fromX = d.source.x + this.config.nodeWidth / 2;
                const fromY = d.source.y + this.config.nodeHeight;
                const toX = d.target.x + this.config.nodeWidth / 2;
                const toY = d.target.y;
                const midY = (fromY + toY) / 2;
                return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
            });
    }

    /**
     * Render complete flow data with performance optimization
     */
    render(data) {
        if (!data || !data.nodes || data.nodes.length === 0) {
            this.emptyState.style.display = 'block';
            return;
        }

        this.emptyState.style.display = 'none';

        const startTime = performance.now();

        // Prepare data
        this.nodes = JSON.parse(JSON.stringify(data.nodes));

        // Create links from edges
        this.links = [];
        if (data.edges) {
            this.links = data.edges.map(edge => ({
                source: edge.from,
                target: edge.to
            }));
        }

        // Check if we should enable optimizations
        const nodeCount = this.nodes.length;
        if (this.perfEngine) {
            const settings = this.perfEngine.getRecommendedSettings(nodeCount);
            this.useVirtualRendering = settings.virtualRendering;
            this.useWebWorker = settings.webWorker && this.webWorkerLayout;

            console.log('[Canvas] Optimization settings:', settings);
        }

        // Update virtual canvas
        if (this.virtualCanvas) {
            this.virtualCanvas.setNodes(this.nodes, this.config);
        }

        // Clear existing
        this.nodesGroup.selectAll('*').remove();
        this.edgesGroup.selectAll('*').remove();

        // Render edges
        const edges = this.edgesGroup.selectAll('path')
            .data(this.links)
            .join('path')
            .attr('class', 'edge')
            .attr('stroke', '#555')
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        // Render nodes in batches for large datasets
        if (this.perfEngine && nodeCount > 100) {
            this.renderNodesBatched();
        } else {
            this.renderNodesImmediate();
        }

        // Apply layout
        this.applyLayout();

        // Update node count
        this.updateNodeCount(this.nodes.length);

        // Update search results
        if (window.searchManager) {
            window.searchManager.updateResults();
        }

        // Update minimap
        if (window.minimapManager) {
            window.minimapManager.update();
        }

        const renderTime = performance.now() - startTime;
        console.log(`[Canvas] Render completed in ${renderTime.toFixed(2)}ms`);
    }

    /**
     * Render nodes immediately
     */
    renderNodesImmediate() {
        this.renderNodes(this.nodes);
    }

    /**
     * Render nodes in batches
     */
    renderNodesBatched() {
        const batchSize = this.perfEngine.config.batchSize;

        this.perfEngine.batch(this.nodes, batchSize, (batchNodes, batchIndex) => {
            this.renderNodes(batchNodes);
        });
    }

    /**
     * Render nodes
     */
    renderNodes(nodes) {
        const nodeGroups = this.nodesGroup.selectAll('g.node')
            .data(nodes, d => d.id)
            .join('g')
            .attr('class', 'node')
            .attr('data-node-id', d => d.id)
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d)))
            .on('click', (event, d) => this.onNodeClick(d));

        // Add node rectangles
        nodeGroups.append('rect')
            .attr('width', this.config.nodeWidth)
            .attr('height', this.config.nodeHeight)
            .attr('rx', this.config.nodeRadius)
            .attr('fill', d => this.getNodeFill(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))');

        // Add node titles
        nodeGroups.append('text')
            .attr('class', 'node-title')
            .attr('x', 10)
            .attr('y', 25)
            .attr('font-size', 14)
            .attr('font-weight', 'bold')
            .attr('fill', '#fff')
            .text(d => this.truncate(this.getNodeTitle(d), 20));

        // Add node content
        nodeGroups.each((d, i, nodes) => {
            const g = d3.select(nodes[i]);
            const contentText = this.truncate(d.content || '', 80);
            const contentLines = this.wrapText(contentText, 22);

            contentLines.forEach((line, idx) => {
                g.append('text')
                    .attr('class', 'node-content')
                    .attr('x', 10)
                    .attr('y', 45 + (idx * 16))
                    .attr('font-size', 11)
                    .attr('fill', '#fff')
                    .attr('opacity', 0.9)
                    .text(line);
            });
        });
    }

    /**
     * Drag handlers
     */
    dragStarted(event, d) {
        if (!event.active && this.layoutMode === 'force') {
            this.simulation.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active && this.layoutMode === 'force') {
            this.simulation.alphaTarget(0);
        }
        d.fx = null;
        d.fy = null;
    }

    /**
     * Zoom controls
     */
    zoomIn() {
        this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.2);
    }

    zoomOut() {
        this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.8);
    }

    resetView() {
        this.svg.transition().duration(500)
            .call(this.zoom.transform, d3.zoomIdentity);
    }

    /**
     * Focus on all nodes (fit to view)
     */
    focusAll() {
        if (this.nodes.length === 0) return;

        // Calculate bounds
        const padding = 50;
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + this.config.nodeWidth);
            maxY = Math.max(maxY, node.y + this.config.nodeHeight);
        });

        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const scale = Math.min(
            this.width / width,
            this.height / height,
            2
        );

        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);

        this.svg.transition().duration(750)
            .call(this.zoom.transform, transform);
    }

    /**
     * Focus on specific node
     */
    focusNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(1.5)
            .translate(-(node.x + this.config.nodeWidth / 2), -(node.y + this.config.nodeHeight / 2));

        this.svg.transition().duration(750)
            .call(this.zoom.transform, transform);
    }

    /**
     * Highlight nodes
     */
    highlightNodes(nodeIds) {
        this.nodesGroup.selectAll('g.node')
            .classed('highlighted', d => nodeIds.includes(d.id))
            .classed('dimmed', d => !nodeIds.includes(d.id));
    }

    /**
     * Clear highlights
     */
    clearHighlights() {
        this.nodesGroup.selectAll('g.node')
            .classed('highlighted', false)
            .classed('dimmed', false);
    }

    /**
     * Clear canvas
     */
    clear() {
        this.nodes = [];
        this.links = [];
        this.nodesGroup.selectAll('*').remove();
        this.edgesGroup.selectAll('*').remove();
        this.emptyState.style.display = 'block';
        this.updateNodeCount(0);
        this.simulation.stop();
    }

    /**
     * Get node fill color
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
     * Wrap text
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
        return lines.slice(0, 3);
    }

    /**
     * Node click handler
     */
    onNodeClick(node) {
        console.log('Node clicked:', node);
        alert(`${this.getNodeTitle(node)}\n\n${node.content}`);
    }

    /**
     * Update node count
     */
    updateNodeCount(count) {
        const nodeCountEl = document.getElementById('node-count');
        nodeCountEl.textContent = `${count} node${count !== 1 ? 's' : ''}`;
    }
}

window.CanvasV2 = CanvasV2;
