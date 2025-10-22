/**
 * Test Data Generator
 * Generates test data for load testing and benchmarking
 */

class TestDataGenerator {
    constructor() {
        this.nodeTypes = ['input', 'output', 'skill', 'auto'];
        this.skillNames = [
            'Parse Input',
            'Analyze Data',
            'Transform',
            'Validate',
            'Process',
            'Calculate',
            'Format Output',
            'Filter',
            'Sort',
            'Aggregate',
        ];

        this.contents = [
            'Processing user request',
            'Analyzing conversation context',
            'Applying transformation rules',
            'Validating input parameters',
            'Computing result values',
            'Formatting output data',
            'Filtering unnecessary items',
            'Sorting by priority',
            'Aggregating statistics',
            'Generating final response',
        ];
    }

    /**
     * Generate random node
     */
    generateNode(id, parentId = null) {
        const type = this.randomChoice(this.nodeTypes);

        const node = {
            id: `test-node-${id}`,
            type: type,
            timestamp: Date.now(),
            parent_id: parentId,
            content: this.randomChoice(this.contents),
        };

        if (type === 'skill') {
            node.skill_name = this.randomChoice(this.skillNames);
        }

        if (type === 'input') {
            node.title = 'User Input';
        } else if (type === 'output') {
            node.title = 'Output';
        }

        return node;
    }

    /**
     * Generate graph with specified node count
     */
    generateGraph(nodeCount) {
        const nodes = [];
        const edges = [];

        // Generate root node
        const root = this.generateNode(0);
        root.type = 'input';
        root.title = 'Root Input';
        nodes.push(root);

        // Generate remaining nodes
        for (let i = 1; i < nodeCount; i++) {
            // Choose a random parent from existing nodes
            const parentIndex = Math.floor(Math.random() * nodes.length);
            const parent = nodes[parentIndex];

            const node = this.generateNode(i, parent.id);
            nodes.push(node);

            // Create edge
            edges.push({
                from: parent.id,
                to: node.id,
            });
        }

        return {
            nodes,
            edges,
            metadata: {
                generated: new Date().toISOString(),
                nodeCount: nodes.length,
                edgeCount: edges.length,
            }
        };
    }

    /**
     * Generate hierarchical graph
     */
    generateHierarchicalGraph(levels, nodesPerLevel) {
        const nodes = [];
        const edges = [];
        let nodeId = 0;

        // Generate root
        const root = this.generateNode(nodeId++);
        root.type = 'input';
        root.title = 'Root Input';
        nodes.push(root);

        let currentLevel = [root];

        // Generate levels
        for (let level = 1; level < levels; level++) {
            const nextLevel = [];

            for (const parent of currentLevel) {
                for (let i = 0; i < nodesPerLevel; i++) {
                    const node = this.generateNode(nodeId++, parent.id);
                    nodes.push(node);
                    nextLevel.push(node);

                    // Create edge
                    edges.push({
                        from: parent.id,
                        to: node.id,
                    });
                }
            }

            currentLevel = nextLevel;
        }

        return {
            nodes,
            edges,
            metadata: {
                generated: new Date().toISOString(),
                levels,
                nodesPerLevel,
                totalNodes: nodes.length,
                totalEdges: edges.length,
            }
        };
    }

    /**
     * Generate complex graph with cycles
     */
    generateComplexGraph(nodeCount, edgeDensity = 1.5) {
        const nodes = [];
        const edges = [];

        // Generate nodes
        for (let i = 0; i < nodeCount; i++) {
            const node = this.generateNode(i);
            nodes.push(node);
        }

        // Generate edges
        const totalEdges = Math.floor(nodeCount * edgeDensity);

        for (let i = 0; i < totalEdges; i++) {
            const fromIndex = Math.floor(Math.random() * nodes.length);
            const toIndex = Math.floor(Math.random() * nodes.length);

            if (fromIndex !== toIndex) {
                edges.push({
                    from: nodes[fromIndex].id,
                    to: nodes[toIndex].id,
                });
            }
        }

        return {
            nodes,
            edges,
            metadata: {
                generated: new Date().toISOString(),
                nodeCount: nodes.length,
                edgeCount: edges.length,
                edgeDensity,
            }
        };
    }

    /**
     * Generate stress test scenarios
     */
    generateStressTestScenarios() {
        return {
            small: this.generateGraph(100),
            medium: this.generateGraph(500),
            large: this.generateGraph(1000),
            xlarge: this.generateGraph(2000),
            hierarchical_small: this.generateHierarchicalGraph(5, 3),
            hierarchical_large: this.generateHierarchicalGraph(7, 5),
            complex_medium: this.generateComplexGraph(500, 2),
            complex_large: this.generateComplexGraph(1000, 2.5),
        };
    }

    /**
     * Random choice from array
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Save test data to localStorage
     */
    saveTestData(key, data) {
        try {
            localStorage.setItem(`test-data-${key}`, JSON.stringify(data));
            console.log(`[TestDataGenerator] Saved test data: ${key}`);
            return true;
        } catch (error) {
            console.error('[TestDataGenerator] Failed to save test data:', error);
            return false;
        }
    }

    /**
     * Load test data from localStorage
     */
    loadTestData(key) {
        try {
            const data = localStorage.getItem(`test-data-${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[TestDataGenerator] Failed to load test data:', error);
            return null;
        }
    }

    /**
     * List available test data
     */
    listTestData() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('test-data-')) {
                keys.push(key.replace('test-data-', ''));
            }
        }
        return keys;
    }

    /**
     * Clear test data
     */
    clearTestData() {
        const keys = this.listTestData();
        keys.forEach(key => {
            localStorage.removeItem(`test-data-${key}`);
        });
        console.log(`[TestDataGenerator] Cleared ${keys.length} test data sets`);
    }
}

/**
 * Performance Benchmark Runner
 */
class PerformanceBenchmark {
    constructor(canvas, performanceEngine) {
        this.canvas = canvas;
        this.perfEngine = performanceEngine;
        this.generator = new TestDataGenerator();
        this.results = [];
    }

    /**
     * Run benchmark suite
     */
    async runBenchmarkSuite() {
        console.group('[Benchmark] Starting benchmark suite');

        const scenarios = [
            { name: '100 nodes', count: 100 },
            { name: '500 nodes', count: 500 },
            { name: '1000 nodes', count: 1000 },
        ];

        for (const scenario of scenarios) {
            await this.runBenchmark(scenario.name, scenario.count);
            await this.wait(2000); // Wait between tests
        }

        console.groupEnd();

        this.generateReport();
    }

    /**
     * Run single benchmark
     */
    async runBenchmark(name, nodeCount) {
        console.group(`[Benchmark] ${name}`);

        // Generate test data
        const data = this.generator.generateGraph(nodeCount);

        // Clear canvas
        this.canvas.clear();

        // Measure initial render
        const renderStart = performance.now();
        this.canvas.render(data);
        const renderTime = performance.now() - renderStart;

        // Wait for layout to settle
        await this.wait(3000);

        // Collect metrics
        const metrics = this.perfEngine.getMetrics();

        const result = {
            name,
            nodeCount,
            renderTime: renderTime.toFixed(2),
            fps: metrics.fps,
            avgFrameTime: metrics.avgFrameTime,
            memoryUsage: metrics.memoryUsage,
            droppedFrames: metrics.droppedFrames,
            health: metrics.health,
            timestamp: new Date().toISOString(),
        };

        this.results.push(result);

        console.log('Results:', result);
        console.groupEnd();

        return result;
    }

    /**
     * Stress test with rapid updates
     */
    async runStressTest(duration = 10000) {
        console.group('[Benchmark] Stress test');

        const startTime = performance.now();
        let updateCount = 0;

        while (performance.now() - startTime < duration) {
            const nodeCount = 50 + Math.floor(Math.random() * 100);
            const data = this.generator.generateGraph(nodeCount);
            this.canvas.render(data);

            updateCount++;
            await this.wait(100);
        }

        const metrics = this.perfEngine.getMetrics();

        console.log(`Updates: ${updateCount}`);
        console.log('Final metrics:', metrics);
        console.groupEnd();
    }

    /**
     * Memory leak test
     */
    async runMemoryLeakTest(iterations = 10) {
        console.group('[Benchmark] Memory leak test');

        const memorySnapshots = [];

        for (let i = 0; i < iterations; i++) {
            const data = this.generator.generateGraph(500);
            this.canvas.render(data);

            await this.wait(1000);

            if (performance.memory) {
                memorySnapshots.push({
                    iteration: i,
                    memory: performance.memory.usedJSHeapSize / 1048576,
                });
            }

            this.canvas.clear();
            await this.wait(500);
        }

        console.table(memorySnapshots);

        // Check for memory leak
        if (memorySnapshots.length > 2) {
            const firstMemory = memorySnapshots[0].memory;
            const lastMemory = memorySnapshots[memorySnapshots.length - 1].memory;
            const increase = lastMemory - firstMemory;
            const increasePercent = (increase / firstMemory) * 100;

            console.log(`Memory increase: ${increase.toFixed(2)}MB (${increasePercent.toFixed(1)}%)`);

            if (increasePercent > 50) {
                console.warn('Potential memory leak detected!');
            } else {
                console.log('No significant memory leak detected');
            }
        }

        console.groupEnd();
    }

    /**
     * Generate benchmark report
     */
    generateReport() {
        console.group('[Benchmark] Report');
        console.table(this.results);

        // Calculate summary
        const summary = {
            totalTests: this.results.length,
            avgFPS: (this.results.reduce((sum, r) => sum + r.fps, 0) / this.results.length).toFixed(1),
            avgRenderTime: (this.results.reduce((sum, r) => sum + parseFloat(r.renderTime), 0) / this.results.length).toFixed(2),
            avgMemory: (this.results.reduce((sum, r) => sum + r.memoryUsage, 0) / this.results.length).toFixed(1),
        };

        console.log('Summary:', summary);

        // Performance rating
        const rating = this.calculatePerformanceRating();
        console.log('Performance Rating:', rating);

        console.groupEnd();

        return {
            results: this.results,
            summary,
            rating,
        };
    }

    /**
     * Calculate performance rating
     */
    calculatePerformanceRating() {
        if (this.results.length === 0) return 'N/A';

        const avgFPS = this.results.reduce((sum, r) => sum + r.fps, 0) / this.results.length;

        if (avgFPS >= 55) return 'Excellent';
        if (avgFPS >= 45) return 'Good';
        if (avgFPS >= 30) return 'Fair';
        return 'Poor';
    }

    /**
     * Wait helper
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Export results
     */
    exportResults(filename = 'benchmark-results.json') {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);

        console.log(`[Benchmark] Results exported to ${filename}`);
    }
}

/**
 * Performance Testing UI
 */
class PerformanceTestUI {
    constructor(canvas, performanceEngine) {
        this.canvas = canvas;
        this.perfEngine = performanceEngine;
        this.generator = new TestDataGenerator();
        this.benchmark = new PerformanceBenchmark(canvas, performanceEngine);

        this.createUI();
    }

    createUI() {
        // Create test panel
        const panel = document.createElement('div');
        panel.id = 'perf-test-panel';
        panel.className = 'perf-test-panel';
        panel.innerHTML = `
            <div class="perf-test-header">
                <h3>Performance Testing</h3>
                <button id="perf-test-close">×</button>
            </div>
            <div class="perf-test-content">
                <div class="perf-test-section">
                    <h4>Load Test Data</h4>
                    <button id="load-100">100 Nodes</button>
                    <button id="load-500">500 Nodes</button>
                    <button id="load-1000">1000 Nodes</button>
                    <button id="load-2000">2000 Nodes</button>
                </div>

                <div class="perf-test-section">
                    <h4>Run Benchmarks</h4>
                    <button id="run-benchmark-suite">Full Benchmark Suite</button>
                    <button id="run-stress-test">Stress Test (10s)</button>
                    <button id="run-memory-test">Memory Leak Test</button>
                </div>

                <div class="perf-test-section">
                    <h4>Actions</h4>
                    <button id="clear-canvas-test">Clear Canvas</button>
                    <button id="export-results">Export Results</button>
                    <button id="log-summary">Log Summary</button>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        document.body.appendChild(panel);

        // Hide by default
        panel.style.display = 'none';

        // Attach event listeners
        this.attachEventListeners();
    }

    addStyles() {
        if (document.getElementById('perf-test-styles')) return;

        const style = document.createElement('style');
        style.id = 'perf-test-styles';
        style.textContent = `
            .perf-test-panel {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 280px;
                background: rgba(15, 20, 25, 0.95);
                border: 1px solid #2a2f3e;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                z-index: 10000;
                color: #e5e7eb;
            }

            .perf-test-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #2a2f3e;
            }

            .perf-test-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #6366f1;
            }

            .perf-test-content {
                padding: 16px;
            }

            .perf-test-section {
                margin-bottom: 16px;
            }

            .perf-test-section h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: #9ca3af;
                text-transform: uppercase;
            }

            .perf-test-section button {
                display: block;
                width: 100%;
                padding: 8px 12px;
                margin-bottom: 6px;
                background: #1a1f2e;
                border: 1px solid #2a2f3e;
                border-radius: 4px;
                color: #e5e7eb;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .perf-test-section button:hover {
                background: #252a39;
                border-color: #6366f1;
            }

            .perf-test-section button:active {
                transform: scale(0.98);
            }

            #perf-test-close {
                background: transparent;
                border: none;
                color: #9ca3af;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                line-height: 24px;
            }
        `;

        document.head.appendChild(style);
    }

    attachEventListeners() {
        document.getElementById('perf-test-close').addEventListener('click', () => {
            this.toggle();
        });

        document.getElementById('load-100').addEventListener('click', () => {
            this.loadTestData(100);
        });

        document.getElementById('load-500').addEventListener('click', () => {
            this.loadTestData(500);
        });

        document.getElementById('load-1000').addEventListener('click', () => {
            this.loadTestData(1000);
        });

        document.getElementById('load-2000').addEventListener('click', () => {
            this.loadTestData(2000);
        });

        document.getElementById('run-benchmark-suite').addEventListener('click', () => {
            this.benchmark.runBenchmarkSuite();
        });

        document.getElementById('run-stress-test').addEventListener('click', () => {
            this.benchmark.runStressTest();
        });

        document.getElementById('run-memory-test').addEventListener('click', () => {
            this.benchmark.runMemoryLeakTest();
        });

        document.getElementById('clear-canvas-test').addEventListener('click', () => {
            this.canvas.clear();
        });

        document.getElementById('export-results').addEventListener('click', () => {
            this.benchmark.exportResults();
        });

        document.getElementById('log-summary').addEventListener('click', () => {
            this.perfEngine.logSummary();
        });
    }

    loadTestData(count) {
        const data = this.generator.generateGraph(count);
        this.canvas.render(data);
        console.log(`[PerformanceTest] Loaded ${count} nodes`);
    }

    show() {
        document.getElementById('perf-test-panel').style.display = 'block';
    }

    hide() {
        document.getElementById('perf-test-panel').style.display = 'none';
    }

    toggle() {
        const panel = document.getElementById('perf-test-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

// Export
window.TestDataGenerator = TestDataGenerator;
window.PerformanceBenchmark = PerformanceBenchmark;
window.PerformanceTestUI = PerformanceTestUI;
