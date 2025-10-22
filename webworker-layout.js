/**
 * Web Worker for Layout Calculations
 * Offloads force simulation calculations to a separate thread
 */

// Check if running in worker context
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    // Worker code
    let simulation = null;
    let nodes = [];
    let links = [];
    let isRunning = false;

    // Configuration
    let config = {
        forceStrength: -800,
        linkDistance: 150,
        linkStrength: 0.5,
        collisionRadius: 120,
        centerStrength: 0.05,
        alphaDecay: 0.02,
        velocityDecay: 0.4,
    };

    /**
     * Initialize simulation
     */
    function initSimulation(width, height) {
        // Simple force simulation implementation
        simulation = {
            width,
            height,
            alpha: 1,
            alphaTarget: 0,
            alphaMin: 0.001,
            alphaDecay: config.alphaDecay,
            velocityDecay: config.velocityDecay,
        };
    }

    /**
     * Set nodes and links
     */
    function setData(newNodes, newLinks) {
        nodes = newNodes.map(n => ({
            ...n,
            vx: n.vx || 0,
            vy: n.vy || 0,
        }));

        links = newLinks.map(l => ({
            ...l,
            source: nodes.find(n => n.id === l.source) || l.source,
            target: nodes.find(n => n.id === l.target) || l.target,
        }));
    }

    /**
     * Apply forces
     */
    function applyForces() {
        if (!simulation) return;

        const alpha = simulation.alpha;

        // Center force
        applyCenterForce(alpha);

        // Link force
        applyLinkForce(alpha);

        // Charge force (many-body)
        applyChargeForce(alpha);

        // Collision force
        applyCollisionForce(alpha);

        // Update positions
        updatePositions(alpha);

        // Decay alpha
        simulation.alpha += (simulation.alphaTarget - simulation.alpha) * simulation.alphaDecay;
    }

    /**
     * Center force - pull nodes toward center
     */
    function applyCenterForce(alpha) {
        const centerX = simulation.width / 2;
        const centerY = simulation.height / 2;
        const strength = config.centerStrength * alpha;

        nodes.forEach(node => {
            if (node.fx !== null && node.fx !== undefined) return;

            node.vx += (centerX - node.x) * strength;
            node.vy += (centerY - node.y) * strength;
        });
    }

    /**
     * Link force - maintain distance between connected nodes
     */
    function applyLinkForce(alpha) {
        const strength = config.linkStrength * alpha;

        links.forEach(link => {
            const source = link.source;
            const target = link.target;

            if (!source || !target) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (distance - config.linkDistance) / distance * strength;

            const fx = dx * force;
            const fy = dy * force;

            if (source.fx === null || source.fx === undefined) {
                source.vx += fx;
                source.vy += fy;
            }

            if (target.fx === null || target.fx === undefined) {
                target.vx -= fx;
                target.vy -= fy;
            }
        });
    }

    /**
     * Charge force - repulsion between all nodes
     */
    function applyChargeForce(alpha) {
        const strength = config.forceStrength * alpha;

        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            if (nodeA.fx !== null && nodeA.fx !== undefined) continue;

            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                if (nodeB.fx !== null && nodeB.fx !== undefined) continue;

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq === 0) continue;

                const distance = Math.sqrt(distanceSq);
                const force = strength / distanceSq;

                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                nodeA.vx -= fx;
                nodeA.vy -= fy;
                nodeB.vx += fx;
                nodeB.vy += fy;
            }
        }
    }

    /**
     * Collision force - prevent overlap
     */
    function applyCollisionForce(alpha) {
        const strength = 0.7 * alpha;
        const radius = config.collisionRadius;

        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];

            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = radius * 2;

                if (distance < minDistance) {
                    const force = (minDistance - distance) / distance * strength;
                    const fx = dx * force;
                    const fy = dy * force;

                    if (nodeA.fx === null || nodeA.fx === undefined) {
                        nodeA.vx -= fx;
                        nodeA.vy -= fy;
                    }

                    if (nodeB.fx === null || nodeB.fx === undefined) {
                        nodeB.vx += fx;
                        nodeB.vy += fy;
                    }
                }
            }
        }
    }

    /**
     * Update node positions
     */
    function updatePositions(alpha) {
        const decay = simulation.velocityDecay;

        nodes.forEach(node => {
            if (node.fx !== null && node.fx !== undefined) {
                node.x = node.fx;
                node.vx = 0;
            } else {
                node.vx *= decay;
                node.x += node.vx;
            }

            if (node.fy !== null && node.fy !== undefined) {
                node.y = node.fy;
                node.vy = 0;
            } else {
                node.vy *= decay;
                node.y += node.vy;
            }
        });
    }

    /**
     * Run simulation tick
     */
    function tick() {
        if (!isRunning || !simulation) return;

        applyForces();

        // Send positions back to main thread
        self.postMessage({
            type: 'tick',
            nodes: nodes.map(n => ({
                id: n.id,
                x: n.x,
                y: n.y,
                vx: n.vx,
                vy: n.vy,
            })),
            alpha: simulation.alpha,
        });

        // Continue if alpha is above minimum
        if (simulation.alpha > simulation.alphaMin) {
            setTimeout(tick, 16); // ~60fps
        } else {
            isRunning = false;
            self.postMessage({ type: 'end' });
        }
    }

    /**
     * Handle messages from main thread
     */
    self.onmessage = function(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'init':
                initSimulation(data.width, data.height);
                if (data.config) {
                    config = { ...config, ...data.config };
                }
                self.postMessage({ type: 'ready' });
                break;

            case 'setData':
                setData(data.nodes, data.links);
                break;

            case 'start':
                if (!isRunning) {
                    isRunning = true;
                    simulation.alpha = 1;
                    tick();
                }
                break;

            case 'stop':
                isRunning = false;
                break;

            case 'restart':
                simulation.alpha = 1;
                simulation.alphaTarget = data.alphaTarget || 0;
                if (!isRunning) {
                    isRunning = true;
                    tick();
                }
                break;

            case 'updateConfig':
                config = { ...config, ...data };
                break;

            case 'setFixed':
                const node = nodes.find(n => n.id === data.id);
                if (node) {
                    node.fx = data.x;
                    node.fy = data.y;
                }
                break;

            case 'releaseFixed':
                const releaseNode = nodes.find(n => n.id === data.id);
                if (releaseNode) {
                    releaseNode.fx = null;
                    releaseNode.fy = null;
                }
                break;

            default:
                console.warn('[Worker] Unknown message type:', type);
        }
    };

    // Worker is ready
    self.postMessage({ type: 'loaded' });

} else {
    // Main thread code - Worker wrapper
    class WebWorkerLayout {
        constructor(canvasWidth, canvasHeight) {
            this.worker = null;
            this.isReady = false;
            this.isRunning = false;
            this.tickCallback = null;
            this.endCallback = null;

            this.width = canvasWidth;
            this.height = canvasHeight;

            this.config = {
                forceStrength: -800,
                linkDistance: 150,
                linkStrength: 0.5,
                collisionRadius: 120,
                centerStrength: 0.05,
                alphaDecay: 0.02,
                velocityDecay: 0.4,
            };

            this.initWorker();
        }

        /**
         * Initialize web worker
         */
        initWorker() {
            try {
                // Create worker from current script
                const blob = new Blob(
                    [document.querySelector('script[src*="webworker-layout.js"]').textContent],
                    { type: 'application/javascript' }
                );
                const workerUrl = URL.createObjectURL(blob);

                this.worker = new Worker(workerUrl);
                this.worker.onmessage = (event) => this.handleMessage(event);
                this.worker.onerror = (error) => this.handleError(error);

                console.log('[WebWorkerLayout] Worker created');
            } catch (error) {
                console.error('[WebWorkerLayout] Failed to create worker:', error);
                this.worker = null;
            }
        }

        /**
         * Handle messages from worker
         */
        handleMessage(event) {
            const { type, nodes, alpha } = event.data;

            switch (type) {
                case 'loaded':
                    this.sendMessage('init', {
                        width: this.width,
                        height: this.height,
                        config: this.config
                    });
                    break;

                case 'ready':
                    this.isReady = true;
                    console.log('[WebWorkerLayout] Worker ready');
                    break;

                case 'tick':
                    if (this.tickCallback) {
                        this.tickCallback(nodes, alpha);
                    }
                    break;

                case 'end':
                    this.isRunning = false;
                    if (this.endCallback) {
                        this.endCallback();
                    }
                    break;
            }
        }

        /**
         * Handle worker errors
         */
        handleError(error) {
            console.error('[WebWorkerLayout] Worker error:', error);
        }

        /**
         * Send message to worker
         */
        sendMessage(type, data = {}) {
            if (!this.worker) {
                console.warn('[WebWorkerLayout] Worker not available');
                return;
            }

            this.worker.postMessage({ type, data });
        }

        /**
         * Set nodes and links
         */
        setData(nodes, links) {
            this.sendMessage('setData', { nodes, links });
        }

        /**
         * Start simulation
         */
        start() {
            if (!this.isReady) {
                console.warn('[WebWorkerLayout] Worker not ready');
                return;
            }

            this.isRunning = true;
            this.sendMessage('start');
        }

        /**
         * Stop simulation
         */
        stop() {
            this.isRunning = false;
            this.sendMessage('stop');
        }

        /**
         * Restart simulation
         */
        restart(alphaTarget = 0) {
            this.sendMessage('restart', { alphaTarget });
        }

        /**
         * Update configuration
         */
        updateConfig(config) {
            this.config = { ...this.config, ...config };
            this.sendMessage('updateConfig', config);
        }

        /**
         * Set node fixed position
         */
        setFixed(nodeId, x, y) {
            this.sendMessage('setFixed', { id: nodeId, x, y });
        }

        /**
         * Release node fixed position
         */
        releaseFixed(nodeId) {
            this.sendMessage('releaseFixed', { id: nodeId });
        }

        /**
         * Set tick callback
         */
        onTick(callback) {
            this.tickCallback = callback;
        }

        /**
         * Set end callback
         */
        onEnd(callback) {
            this.endCallback = callback;
        }

        /**
         * Check if available
         */
        isAvailable() {
            return this.worker !== null && this.isReady;
        }

        /**
         * Destroy worker
         */
        destroy() {
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
                console.log('[WebWorkerLayout] Worker terminated');
            }
        }
    }

    // Export
    window.WebWorkerLayout = WebWorkerLayout;
}
