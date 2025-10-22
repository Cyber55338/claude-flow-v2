/**
 * Interactions.js - Central Interaction Engine
 * Manages all node interactions, selections, and visual feedback
 */

class Interactions {
    constructor(canvas) {
        this.canvas = canvas;
        this.tooltip = new Tooltip();
        this.modal = new Modal();
        this.contextMenu = new ContextMenu();

        // Selection state
        this.selectedNodes = new Set();
        this.highlightedNodes = new Set();

        // Interaction state
        this.isMultiSelect = false;
        this.lastHoverNode = null;

        // Animation frame ID for smooth updates
        this.animationFrame = null;

        this.init();
    }

    /**
     * Initialize interactions
     */
    init() {
        console.log('Initializing interactions...');
        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const svg = this.canvas.svg;

        // Node hover events (delegated)
        svg.addEventListener('mouseover', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                this.handleNodeHover(nodeElement, e);
            }
        });

        svg.addEventListener('mouseout', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement && !nodeElement.contains(e.relatedTarget)) {
                this.handleNodeUnhover(nodeElement);
            }
        });

        svg.addEventListener('mousemove', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                this.tooltip.updatePosition(e.clientX, e.clientY);
            }
        });

        // Node click events
        svg.addEventListener('click', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                this.handleNodeClick(nodeElement, e);
            } else {
                // Click on canvas background
                this.clearSelection();
            }
        });

        // Node double-click
        svg.addEventListener('dblclick', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                this.handleNodeDoubleClick(nodeElement, e);
            }
        });

        // Node right-click (context menu)
        svg.addEventListener('contextmenu', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                e.preventDefault();
                this.handleNodeContextMenu(nodeElement, e);
            }
        });

        // Edge hover events
        svg.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('edge')) {
                this.handleEdgeHover(e.target);
            }
        });

        svg.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('edge')) {
                this.handleEdgeUnhover(e.target);
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });

        // Mobile touch events
        this.setupTouchEvents();
    }

    /**
     * Setup touch events for mobile
     */
    setupTouchEvents() {
        const svg = this.canvas.svg;
        let touchStartTime = 0;
        let touchStartNode = null;

        svg.addEventListener('touchstart', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement) {
                touchStartTime = Date.now();
                touchStartNode = nodeElement;
            }
        });

        svg.addEventListener('touchend', (e) => {
            const nodeElement = e.target.closest('.node');
            if (nodeElement && nodeElement === touchStartNode) {
                const touchDuration = Date.now() - touchStartTime;

                // Quick tap = click (show modal)
                if (touchDuration < 300) {
                    this.handleNodeClick(nodeElement, e);
                }
            }
            touchStartNode = null;
        });
    }

    /**
     * Handle node hover
     */
    handleNodeHover(nodeElement, event) {
        const nodeId = nodeElement.getAttribute('data-node-id');
        const nodeData = this.getNodeData(nodeId);

        if (!nodeData) return;

        // Add hover class
        nodeElement.classList.add('node-hover');

        // Show tooltip
        this.tooltip.show(nodeData, event);

        // Highlight connected nodes
        if (!this.highlightedNodes.size) {
            this.highlightConnections(nodeId, true);
        }

        this.lastHoverNode = nodeId;
    }

    /**
     * Handle node unhover
     */
    handleNodeUnhover(nodeElement) {
        // Remove hover class
        nodeElement.classList.remove('node-hover');

        // Hide tooltip
        this.tooltip.hide();

        // Clear connection highlights
        if (this.lastHoverNode) {
            this.clearHighlights();
            this.lastHoverNode = null;
        }
    }

    /**
     * Handle node click
     */
    handleNodeClick(nodeElement, event) {
        const nodeId = nodeElement.getAttribute('data-node-id');
        const nodeData = this.getNodeData(nodeId);

        if (!nodeData) return;

        // Multi-select with Ctrl/Cmd
        if (event.ctrlKey || event.metaKey) {
            this.toggleSelection(nodeId);
        } else {
            // Single select and open modal
            this.clearSelection();
            this.selectNode(nodeId);
            this.modal.open(nodeData);
        }
    }

    /**
     * Handle node double-click
     */
    handleNodeDoubleClick(nodeElement, event) {
        event.preventDefault();
        const nodeId = nodeElement.getAttribute('data-node-id');

        // Focus and zoom on node
        this.focusNode(nodeId);
    }

    /**
     * Handle node context menu
     */
    handleNodeContextMenu(nodeElement, event) {
        event.preventDefault();

        const nodeId = nodeElement.getAttribute('data-node-id');
        const nodeData = this.getNodeData(nodeId);

        if (!nodeData) return;

        // Show context menu
        this.contextMenu.show(nodeData, event.clientX, event.clientY);
    }

    /**
     * Handle edge hover
     */
    handleEdgeHover(edgeElement) {
        edgeElement.classList.add('edge-hover');
    }

    /**
     * Handle edge unhover
     */
    handleEdgeUnhover(edgeElement) {
        edgeElement.classList.remove('edge-hover');
    }

    /**
     * Handle keyboard down
     */
    handleKeyDown(event) {
        // Track multi-select modifier
        if (event.ctrlKey || event.metaKey) {
            this.isMultiSelect = true;
        }

        // Escape to clear selection
        if (event.key === 'Escape') {
            this.clearSelection();
            this.clearHighlights();
        }

        // Delete selected nodes (for future implementation)
        if (event.key === 'Delete' && this.selectedNodes.size > 0) {
            console.log('Delete selected nodes:', Array.from(this.selectedNodes));
        }

        // Select all (Ctrl+A)
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            this.selectAll();
        }
    }

    /**
     * Handle keyboard up
     */
    handleKeyUp(event) {
        if (!event.ctrlKey && !event.metaKey) {
            this.isMultiSelect = false;
        }
    }

    /**
     * Select node
     */
    selectNode(nodeId) {
        this.selectedNodes.add(nodeId);
        this.updateNodeSelection(nodeId, true);
    }

    /**
     * Deselect node
     */
    deselectNode(nodeId) {
        this.selectedNodes.delete(nodeId);
        this.updateNodeSelection(nodeId, false);
    }

    /**
     * Toggle node selection
     */
    toggleSelection(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.deselectNode(nodeId);
        } else {
            this.selectNode(nodeId);
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedNodes.forEach(nodeId => {
            this.updateNodeSelection(nodeId, false);
        });
        this.selectedNodes.clear();
    }

    /**
     * Select all nodes
     */
    selectAll() {
        const data = this.canvas.getData();
        if (!data || !data.nodes) return;

        data.nodes.forEach(node => {
            this.selectNode(node.id);
        });
    }

    /**
     * Update node selection visual state
     */
    updateNodeSelection(nodeId, selected) {
        const nodeElement = document.querySelector(`.node[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;

        if (selected) {
            nodeElement.classList.add('node-selected');
        } else {
            nodeElement.classList.remove('node-selected');
        }
    }

    /**
     * Highlight connections for a node
     */
    highlightConnections(nodeId, temporary = false) {
        if (!temporary) {
            this.clearHighlights();
        }

        const connections = this.getConnections(nodeId);

        // Highlight the node itself
        this.highlightNode(nodeId);

        // Highlight parent
        if (connections.parent) {
            this.highlightNode(connections.parent.id);
            this.highlightEdge(connections.parent.id, nodeId);
        }

        // Highlight children
        connections.children.forEach(child => {
            this.highlightNode(child.id);
            this.highlightEdge(nodeId, child.id);
        });

        // Dim other nodes
        if (!temporary) {
            this.dimOtherNodes([nodeId, ...connections.children.map(c => c.id), connections.parent?.id].filter(Boolean));
        }
    }

    /**
     * Highlight a single node
     */
    highlightNode(nodeId) {
        const nodeElement = document.querySelector(`.node[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;

        nodeElement.classList.add('node-highlighted');
        this.highlightedNodes.add(nodeId);
    }

    /**
     * Highlight edge between two nodes
     */
    highlightEdge(fromId, toId) {
        // Find edge element (edges don't have IDs, need to match by path)
        const edges = document.querySelectorAll('.edge');
        edges.forEach(edge => {
            // For now, just add a general highlight class
            // In a more advanced implementation, we'd match specific edges
            edge.classList.add('edge-highlighted');
        });
    }

    /**
     * Dim nodes not in the list
     */
    dimOtherNodes(keepNodeIds) {
        const data = this.canvas.getData();
        if (!data || !data.nodes) return;

        data.nodes.forEach(node => {
            if (!keepNodeIds.includes(node.id)) {
                const nodeElement = document.querySelector(`.node[data-node-id="${node.id}"]`);
                if (nodeElement) {
                    nodeElement.classList.add('node-dimmed');
                }
            }
        });
    }

    /**
     * Clear all highlights
     */
    clearHighlights() {
        // Clear highlighted nodes
        this.highlightedNodes.forEach(nodeId => {
            const nodeElement = document.querySelector(`.node[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.classList.remove('node-highlighted');
            }
        });
        this.highlightedNodes.clear();

        // Clear dimmed nodes
        document.querySelectorAll('.node-dimmed').forEach(node => {
            node.classList.remove('node-dimmed');
        });

        // Clear edge highlights
        document.querySelectorAll('.edge-highlighted').forEach(edge => {
            edge.classList.remove('edge-highlighted');
        });
    }

    /**
     * Focus on a node (center and zoom)
     */
    focusNode(nodeId) {
        const nodeElement = document.querySelector(`.node[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;

        const nodeData = this.getNodeData(nodeId);
        if (!nodeData || !nodeData.x || !nodeData.y) return;

        // Calculate center position
        const svg = this.canvas.svg;
        const svgRect = svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;

        // Calculate pan to center node
        const scale = 1.5; // Zoom level
        const targetPanX = centerX - (nodeData.x + this.canvas.config.nodeWidth / 2) * scale;
        const targetPanY = centerY - (nodeData.y + this.canvas.config.nodeHeight / 2) * scale;

        // Animate to position
        this.animateTransform(targetPanX, targetPanY, scale);

        // Highlight node
        this.highlightConnections(nodeId);
    }

    /**
     * Animate canvas transform
     */
    animateTransform(targetPanX, targetPanY, targetZoom) {
        const duration = 500; // ms
        const startTime = Date.now();
        const startPanX = this.canvas.panX;
        const startPanY = this.canvas.panY;
        const startZoom = this.canvas.zoom;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;

            // Interpolate values
            this.canvas.panX = startPanX + (targetPanX - startPanX) * eased;
            this.canvas.panY = startPanY + (targetPanY - startPanY) * eased;
            this.canvas.zoom = startZoom + (targetZoom - startZoom) * eased;

            this.canvas.updateTransform();

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Get node data by ID
     */
    getNodeData(nodeId) {
        const data = this.canvas.getData();
        if (!data || !data.nodes) return null;

        return data.nodes.find(n => n.id === nodeId);
    }

    /**
     * Get node connections (parent and children)
     */
    getConnections(nodeId) {
        const data = this.canvas.getData();
        if (!data || !data.nodes) return { parent: null, children: [] };

        const node = data.nodes.find(n => n.id === nodeId);
        if (!node) return { parent: null, children: [] };

        const parent = node.parent_id ? data.nodes.find(n => n.id === node.parent_id) : null;
        const children = data.nodes.filter(n => n.parent_id === nodeId);

        return { parent, children };
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.tooltip.destroy();
        this.modal.destroy();
        this.contextMenu.destroy();

        this.selectedNodes.clear();
        this.highlightedNodes.clear();
    }
}

// Export
window.Interactions = Interactions;
