/**
 * Performance Optimization Engine
 * Provides comprehensive performance utilities for Claude Flow
 */

class PerformanceEngine {
    constructor() {
        this.config = {
            // Performance targets
            targetFPS: 60,
            frameTime: 16.67, // ~60fps
            maxNodes: 1000,
            warningNodeCount: 500,

            // Optimization thresholds
            enableVirtualRenderingAt: 100,
            enableWebWorkerAt: 200,
            enableAggressiveOptimizationAt: 500,

            // Throttle/Debounce timings
            zoomThrottle: 16, // ~60fps
            panThrottle: 16,
            resizeDebounce: 150,
            layoutDebounce: 100,

            // Rendering optimizations
            batchSize: 50, // Render nodes in batches
            cullingEnabled: true,
            lodEnabled: true, // Level of Detail

            // Memory management
            nodePoolSize: 1000,
            recyclingEnabled: true,
            gcInterval: 30000, // 30 seconds
        };

        this.metrics = {
            fps: 0,
            frameTime: 0,
            renderTime: 0,
            layoutTime: 0,
            memoryUsage: 0,
            nodeCount: 0,
            visibleNodes: 0,
            droppedFrames: 0,
        };

        this.frameHistory = [];
        this.maxFrameHistory = 60;

        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();

        // Throttled/Debounced functions cache
        this.throttledFunctions = new Map();
        this.debouncedFunctions = new Map();

        // Node pool for recycling
        this.nodePool = [];

        // Performance monitoring
        this.isMonitoring = false;
        this.rafId = null;

        this.init();
    }

    init() {
        // Start FPS monitoring
        this.startMonitoring();

        // Setup memory monitoring
        this.setupMemoryMonitoring();

        // Setup GC interval
        if (this.config.recyclingEnabled) {
            this.setupGarbageCollection();
        }

        console.log('[Performance] Engine initialized', this.config);
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitorFrame();
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Monitor frame performance
     */
    monitorFrame() {
        if (!this.isMonitoring) return;

        const now = performance.now();
        const frameTime = now - this.lastFrameTime;

        // Update frame time
        this.metrics.frameTime = frameTime;
        this.frameHistory.push(frameTime);

        if (this.frameHistory.length > this.maxFrameHistory) {
            this.frameHistory.shift();
        }

        // Track dropped frames (>33ms = <30fps)
        if (frameTime > 33) {
            this.metrics.droppedFrames++;
        }

        // Calculate FPS every second
        this.frameCount++;
        const elapsed = now - this.lastFPSUpdate;

        if (elapsed >= 1000) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFPSUpdate = now;

            // Emit FPS event
            this.emitMetricsUpdate();
        }

        this.lastFrameTime = now;
        this.rafId = requestAnimationFrame(() => this.monitorFrame());
    }

    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('[Performance] Memory API not available');
            return;
        }

        setInterval(() => {
            this.metrics.memoryUsage = Math.round(
                performance.memory.usedJSHeapSize / 1048576
            ); // Convert to MB
        }, 1000);
    }

    /**
     * Setup garbage collection interval
     */
    setupGarbageCollection() {
        setInterval(() => {
            this.cleanupNodePool();
        }, this.config.gcInterval);
    }

    /**
     * Emit metrics update event
     */
    emitMetricsUpdate() {
        const event = new CustomEvent('performance:metrics', {
            detail: this.getMetrics()
        });
        window.dispatchEvent(event);
    }

    /**
     * Get current performance metrics
     */
    getMetrics() {
        const avgFrameTime = this.frameHistory.length > 0
            ? this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length
            : 0;

        return {
            ...this.metrics,
            avgFrameTime: avgFrameTime.toFixed(2),
            targetFPS: this.config.targetFPS,
            health: this.getPerformanceHealth(),
        };
    }

    /**
     * Get performance health status
     */
    getPerformanceHealth() {
        const { fps, memoryUsage, nodeCount } = this.metrics;

        if (fps < 30 || memoryUsage > 500 || nodeCount > 1000) {
            return 'critical';
        } else if (fps < 45 || memoryUsage > 300 || nodeCount > 500) {
            return 'warning';
        } else {
            return 'good';
        }
    }

    /**
     * Measure function execution time
     */
    measure(label, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;

        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

        return { result, duration };
    }

    /**
     * Async measure
     */
    async measureAsync(label, fn) {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;

        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

        return { result, duration };
    }

    /**
     * Throttle function
     */
    throttle(key, fn, delay = null) {
        delay = delay || this.config.zoomThrottle;

        if (!this.throttledFunctions.has(key)) {
            let lastCall = 0;
            let timeoutId = null;

            const throttled = (...args) => {
                const now = performance.now();
                const elapsed = now - lastCall;

                if (elapsed >= delay) {
                    lastCall = now;
                    fn.apply(this, args);
                } else {
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        lastCall = performance.now();
                        fn.apply(this, args);
                    }, delay - elapsed);
                }
            };

            this.throttledFunctions.set(key, throttled);
        }

        return this.throttledFunctions.get(key);
    }

    /**
     * Debounce function
     */
    debounce(key, fn, delay = null) {
        delay = delay || this.config.resizeDebounce;

        if (!this.debouncedFunctions.has(key)) {
            let timeoutId = null;

            const debounced = (...args) => {
                if (timeoutId) clearTimeout(timeoutId);

                timeoutId = setTimeout(() => {
                    fn.apply(this, args);
                    timeoutId = null;
                }, delay);
            };

            this.debouncedFunctions.set(key, debounced);
        }

        return this.debouncedFunctions.get(key);
    }

    /**
     * Request animation frame wrapper
     */
    raf(fn) {
        return requestAnimationFrame(() => {
            const start = performance.now();
            fn();
            this.metrics.renderTime = performance.now() - start;
        });
    }

    /**
     * Batch operations
     */
    batch(items, batchSize, operation) {
        const batches = Math.ceil(items.length / batchSize);
        let currentBatch = 0;

        const processBatch = () => {
            const start = currentBatch * batchSize;
            const end = Math.min(start + batchSize, items.length);
            const batchItems = items.slice(start, end);

            operation(batchItems, currentBatch);

            currentBatch++;

            if (currentBatch < batches) {
                requestAnimationFrame(processBatch);
            }
        };

        processBatch();
    }

    /**
     * Node recycling - Get node from pool
     */
    acquireNode() {
        if (this.nodePool.length > 0) {
            return this.nodePool.pop();
        }
        return null;
    }

    /**
     * Node recycling - Return node to pool
     */
    releaseNode(node) {
        if (this.nodePool.length < this.config.nodePoolSize) {
            // Reset node properties
            node.x = 0;
            node.y = 0;
            node.fx = null;
            node.fy = null;

            this.nodePool.push(node);
        }
    }

    /**
     * Cleanup node pool
     */
    cleanupNodePool() {
        const excessNodes = this.nodePool.length - this.config.nodePoolSize;
        if (excessNodes > 0) {
            this.nodePool.splice(0, excessNodes);
            console.log(`[Performance] Cleaned up ${excessNodes} nodes from pool`);
        }
    }

    /**
     * Check if optimization should be enabled
     */
    shouldEnableOptimization(type, nodeCount) {
        switch (type) {
            case 'virtual':
                return nodeCount >= this.config.enableVirtualRenderingAt;
            case 'worker':
                return nodeCount >= this.config.enableWebWorkerAt;
            case 'aggressive':
                return nodeCount >= this.config.enableAggressiveOptimizationAt;
            default:
                return false;
        }
    }

    /**
     * Get recommended settings based on node count
     */
    getRecommendedSettings(nodeCount) {
        const settings = {
            virtualRendering: nodeCount >= this.config.enableVirtualRenderingAt,
            webWorker: nodeCount >= this.config.enableWebWorkerAt,
            simplifiedRendering: nodeCount >= this.config.enableAggressiveOptimizationAt,
            batchSize: Math.min(50, Math.max(10, Math.floor(nodeCount / 10))),
            simulationStrength: nodeCount < 200 ? 1 : 0.5,
        };

        if (nodeCount > this.config.warningNodeCount) {
            console.warn(`[Performance] High node count (${nodeCount}). Recommended optimizations:`, settings);
        }

        return settings;
    }

    /**
     * Update node count metric
     */
    updateNodeCount(total, visible) {
        this.metrics.nodeCount = total;
        this.metrics.visibleNodes = visible || total;
    }

    /**
     * Get performance report
     */
    getReport() {
        const metrics = this.getMetrics();

        return {
            timestamp: new Date().toISOString(),
            metrics,
            config: this.config,
            recommendations: this.getRecommendations(metrics),
        };
    }

    /**
     * Get performance recommendations
     */
    getRecommendations(metrics) {
        const recommendations = [];

        if (metrics.fps < 30) {
            recommendations.push({
                severity: 'critical',
                message: 'FPS is critically low',
                actions: [
                    'Enable virtual rendering',
                    'Reduce node detail level',
                    'Enable web worker for layout',
                    'Consider reducing node count'
                ]
            });
        } else if (metrics.fps < 45) {
            recommendations.push({
                severity: 'warning',
                message: 'FPS is below target',
                actions: [
                    'Enable virtual rendering',
                    'Use web worker for layout calculations'
                ]
            });
        }

        if (metrics.memoryUsage > 500) {
            recommendations.push({
                severity: 'critical',
                message: 'Memory usage is very high',
                actions: [
                    'Enable node recycling',
                    'Clear unused nodes',
                    'Reduce cache size'
                ]
            });
        } else if (metrics.memoryUsage > 300) {
            recommendations.push({
                severity: 'warning',
                message: 'Memory usage is elevated',
                actions: [
                    'Enable node recycling',
                    'Monitor for memory leaks'
                ]
            });
        }

        if (metrics.nodeCount > 1000) {
            recommendations.push({
                severity: 'critical',
                message: 'Node count exceeds maximum',
                actions: [
                    'Enable aggressive optimization',
                    'Use pagination or filtering',
                    'Consider data reduction'
                ]
            });
        } else if (metrics.nodeCount > 500) {
            recommendations.push({
                severity: 'warning',
                message: 'Node count is high',
                actions: [
                    'Enable virtual rendering',
                    'Use simplified node rendering'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Log performance summary
     */
    logSummary() {
        const report = this.getReport();

        console.group('[Performance] Summary');
        console.table(report.metrics);

        if (report.recommendations.length > 0) {
            console.group('Recommendations');
            report.recommendations.forEach(rec => {
                console.warn(`[${rec.severity.toUpperCase()}] ${rec.message}`);
                rec.actions.forEach(action => console.log(`  - ${action}`));
            });
            console.groupEnd();
        }

        console.groupEnd();
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.stopMonitoring();
        this.throttledFunctions.clear();
        this.debouncedFunctions.clear();
        this.nodePool = [];
        console.log('[Performance] Engine destroyed');
    }
}

// Export
window.PerformanceEngine = PerformanceEngine;
