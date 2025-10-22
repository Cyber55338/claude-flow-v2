/**
 * Virtual Canvas Renderer
 * Implements viewport culling and virtual scrolling for efficient rendering
 */

class VirtualCanvas {
    constructor(canvas, performanceEngine) {
        this.canvas = canvas;
        this.perfEngine = performanceEngine;

        this.config = {
            // Viewport configuration
            viewportPadding: 200, // Extra padding around viewport
            cullingEnabled: true,

            // Level of Detail
            lodEnabled: true,
            lodLevels: [
                { minScale: 2, detail: 'full' },
                { minScale: 0.5, detail: 'medium' },
                { minScale: 0, detail: 'low' }
            ],

            // Spatial indexing
            spatialIndexEnabled: true,
            quadtreeCapacity: 4,
            quadtreeMaxDepth: 8,

            // Rendering optimization
            renderBatchSize: 50,
            useRequestIdleCallback: true,
        };

        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            scale: 1,
        };

        this.allNodes = [];
        this.visibleNodes = [];
        this.spatialIndex = null;

        this.currentLOD = 'full';
        this.lastCullingUpdate = 0;
        this.cullingThrottle = 16; // ~60fps

        this.init();
    }

    init() {
        // Initialize spatial index
        if (this.config.spatialIndexEnabled) {
            this.initSpatialIndex();
        }

        console.log('[VirtualCanvas] Initialized', this.config);
    }

    /**
     * Initialize quadtree spatial index
     */
    initSpatialIndex() {
        this.spatialIndex = new Quadtree({
            x: 0,
            y: 0,
            width: 10000,
            height: 10000
        }, this.config.quadtreeCapacity, this.config.quadtreeMaxDepth);
    }

    /**
     * Update viewport from zoom transform
     */
    updateViewport(transform, width, height) {
        const scale = transform.k;
        const tx = transform.x;
        const ty = transform.y;

        // Calculate viewport in world coordinates
        this.viewport = {
            x: -tx / scale,
            y: -ty / scale,
            width: width / scale,
            height: height / scale,
            scale: scale,
            padding: this.config.viewportPadding / scale
        };

        // Update LOD based on scale
        this.updateLOD(scale);

        // Throttle culling updates
        const now = performance.now();
        if (now - this.lastCullingUpdate > this.cullingThrottle) {
            this.updateVisibleNodes();
            this.lastCullingUpdate = now;
        }
    }

    /**
     * Update Level of Detail based on zoom
     */
    updateLOD(scale) {
        let newLOD = 'low';

        for (const level of this.config.lodLevels) {
            if (scale >= level.minScale) {
                newLOD = level.detail;
                break;
            }
        }

        if (newLOD !== this.currentLOD) {
            this.currentLOD = newLOD;
            console.log(`[VirtualCanvas] LOD changed to: ${newLOD} (scale: ${scale.toFixed(2)})`);

            // Emit LOD change event
            window.dispatchEvent(new CustomEvent('virtualCanvas:lodChange', {
                detail: { lod: newLOD, scale }
            }));
        }
    }

    /**
     * Set all nodes
     */
    setNodes(nodes, nodeConfig) {
        this.allNodes = nodes;
        this.nodeConfig = nodeConfig || {
            width: 180,
            height: 100
        };

        // Rebuild spatial index
        if (this.config.spatialIndexEnabled) {
            this.rebuildSpatialIndex();
        }

        // Update visible nodes
        this.updateVisibleNodes();
    }

    /**
     * Rebuild spatial index
     */
    rebuildSpatialIndex() {
        if (!this.spatialIndex) return;

        this.spatialIndex.clear();

        this.allNodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
                this.spatialIndex.insert({
                    x: node.x,
                    y: node.y,
                    width: this.nodeConfig.width,
                    height: this.nodeConfig.height,
                    data: node
                });
            }
        });
    }

    /**
     * Update visible nodes based on viewport
     */
    updateVisibleNodes() {
        if (!this.config.cullingEnabled) {
            this.visibleNodes = this.allNodes;
            this.updateMetrics();
            return;
        }

        const start = performance.now();

        if (this.config.spatialIndexEnabled && this.spatialIndex) {
            // Use spatial index for efficient querying
            this.visibleNodes = this.queryVisibleNodesSpatial();
        } else {
            // Fall back to linear search
            this.visibleNodes = this.queryVisibleNodesLinear();
        }

        const duration = performance.now() - start;

        if (duration > 10) {
            console.warn(`[VirtualCanvas] Culling took ${duration.toFixed(2)}ms`);
        }

        this.updateMetrics();

        // Emit visibility change event
        window.dispatchEvent(new CustomEvent('virtualCanvas:visibilityChange', {
            detail: {
                total: this.allNodes.length,
                visible: this.visibleNodes.length,
                culled: this.allNodes.length - this.visibleNodes.length
            }
        }));
    }

    /**
     * Query visible nodes using spatial index
     */
    queryVisibleNodesSpatial() {
        const vp = this.viewport;
        const bounds = {
            x: vp.x - vp.padding,
            y: vp.y - vp.padding,
            width: vp.width + vp.padding * 2,
            height: vp.height + vp.padding * 2
        };

        const items = this.spatialIndex.retrieve(bounds);
        return items.map(item => item.data);
    }

    /**
     * Query visible nodes using linear search
     */
    queryVisibleNodesLinear() {
        const vp = this.viewport;
        const minX = vp.x - vp.padding;
        const maxX = vp.x + vp.width + vp.padding;
        const minY = vp.y - vp.padding;
        const maxY = vp.y + vp.height + vp.padding;

        return this.allNodes.filter(node => {
            if (node.x === undefined || node.y === undefined) return false;

            return (
                node.x + this.nodeConfig.width >= minX &&
                node.x <= maxX &&
                node.y + this.nodeConfig.height >= minY &&
                node.y <= maxY
            );
        });
    }

    /**
     * Check if node is visible
     */
    isNodeVisible(node) {
        if (!this.config.cullingEnabled) return true;

        const vp = this.viewport;
        const minX = vp.x - vp.padding;
        const maxX = vp.x + vp.width + vp.padding;
        const minY = vp.y - vp.padding;
        const maxY = vp.y + vp.height + vp.padding;

        return (
            node.x !== undefined &&
            node.y !== undefined &&
            node.x + this.nodeConfig.width >= minX &&
            node.x <= maxX &&
            node.y + this.nodeConfig.height >= minY &&
            node.y <= maxY
        );
    }

    /**
     * Get visible nodes
     */
    getVisibleNodes() {
        return this.visibleNodes;
    }

    /**
     * Get current LOD
     */
    getLOD() {
        return this.currentLOD;
    }

    /**
     * Get node render detail based on LOD
     */
    getNodeDetail(node) {
        switch (this.currentLOD) {
            case 'full':
                return {
                    showText: true,
                    showIcon: true,
                    showShadow: true,
                    showContent: true,
                    textLines: 3
                };
            case 'medium':
                return {
                    showText: true,
                    showIcon: false,
                    showShadow: false,
                    showContent: true,
                    textLines: 2
                };
            case 'low':
                return {
                    showText: true,
                    showIcon: false,
                    showShadow: false,
                    showContent: false,
                    textLines: 1
                };
            default:
                return {
                    showText: true,
                    showIcon: true,
                    showShadow: true,
                    showContent: true,
                    textLines: 3
                };
        }
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        if (this.perfEngine) {
            this.perfEngine.updateNodeCount(
                this.allNodes.length,
                this.visibleNodes.length
            );
        }
    }

    /**
     * Get viewport statistics
     */
    getStats() {
        return {
            total: this.allNodes.length,
            visible: this.visibleNodes.length,
            culled: this.allNodes.length - this.visibleNodes.length,
            cullRate: ((this.allNodes.length - this.visibleNodes.length) / this.allNodes.length * 100).toFixed(1) + '%',
            lod: this.currentLOD,
            viewport: this.viewport
        };
    }

    /**
     * Force update
     */
    forceUpdate() {
        this.updateVisibleNodes();
    }

    /**
     * Clear
     */
    clear() {
        this.allNodes = [];
        this.visibleNodes = [];

        if (this.spatialIndex) {
            this.spatialIndex.clear();
        }

        this.updateMetrics();
    }

    /**
     * Destroy
     */
    destroy() {
        this.clear();
        console.log('[VirtualCanvas] Destroyed');
    }
}

/**
 * Simple Quadtree Implementation
 */
class Quadtree {
    constructor(bounds, capacity = 4, maxDepth = 8, depth = 0) {
        this.bounds = bounds; // { x, y, width, height }
        this.capacity = capacity;
        this.maxDepth = maxDepth;
        this.depth = depth;
        this.items = [];
        this.divided = false;
        this.children = [];
    }

    /**
     * Insert item into quadtree
     */
    insert(item) {
        // Check if item is within bounds
        if (!this.contains(item)) {
            return false;
        }

        // If not at capacity, add to items
        if (this.items.length < this.capacity || this.depth >= this.maxDepth) {
            this.items.push(item);
            return true;
        }

        // Subdivide if not already divided
        if (!this.divided) {
            this.subdivide();
        }

        // Insert into children
        for (const child of this.children) {
            if (child.insert(item)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Retrieve items within bounds
     */
    retrieve(range, found = []) {
        // Check if range intersects with bounds
        if (!this.intersects(range)) {
            return found;
        }

        // Add items that intersect with range
        for (const item of this.items) {
            if (this.itemIntersects(item, range)) {
                found.push(item);
            }
        }

        // Recursively check children
        if (this.divided) {
            for (const child of this.children) {
                child.retrieve(range, found);
            }
        }

        return found;
    }

    /**
     * Subdivide quadtree into 4 children
     */
    subdivide() {
        const { x, y, width, height } = this.bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const nextDepth = this.depth + 1;

        // Create 4 children
        this.children = [
            // Top-left
            new Quadtree(
                { x, y, width: halfWidth, height: halfHeight },
                this.capacity, this.maxDepth, nextDepth
            ),
            // Top-right
            new Quadtree(
                { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
                this.capacity, this.maxDepth, nextDepth
            ),
            // Bottom-left
            new Quadtree(
                { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
                this.capacity, this.maxDepth, nextDepth
            ),
            // Bottom-right
            new Quadtree(
                { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
                this.capacity, this.maxDepth, nextDepth
            )
        ];

        this.divided = true;

        // Redistribute items to children
        const itemsToRedistribute = [...this.items];
        this.items = [];

        for (const item of itemsToRedistribute) {
            let inserted = false;
            for (const child of this.children) {
                if (child.insert(item)) {
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.items.push(item);
            }
        }
    }

    /**
     * Check if item is within bounds
     */
    contains(item) {
        return (
            item.x >= this.bounds.x &&
            item.x + item.width <= this.bounds.x + this.bounds.width &&
            item.y >= this.bounds.y &&
            item.y + item.height <= this.bounds.y + this.bounds.height
        );
    }

    /**
     * Check if bounds intersect
     */
    intersects(range) {
        return !(
            range.x > this.bounds.x + this.bounds.width ||
            range.x + range.width < this.bounds.x ||
            range.y > this.bounds.y + this.bounds.height ||
            range.y + range.height < this.bounds.y
        );
    }

    /**
     * Check if item intersects with range
     */
    itemIntersects(item, range) {
        return !(
            item.x > range.x + range.width ||
            item.x + item.width < range.x ||
            item.y > range.y + range.height ||
            item.y + item.height < range.y
        );
    }

    /**
     * Clear quadtree
     */
    clear() {
        this.items = [];
        this.divided = false;
        this.children = [];
    }
}

// Export
window.VirtualCanvas = VirtualCanvas;
window.Quadtree = Quadtree;
