/**
 * Performance Monitor UI
 * Visual dashboard for real-time performance metrics
 */

class PerformanceMonitor {
    constructor(performanceEngine) {
        this.perfEngine = performanceEngine;
        this.container = null;
        this.isVisible = false;
        this.updateInterval = null;

        this.charts = {
            fps: [],
            frameTime: [],
            memory: [],
        };

        this.maxDataPoints = 60;

        this.init();
    }

    init() {
        this.createUI();
        this.attachEventListeners();
        this.startUpdates();

        console.log('[PerformanceMonitor] Initialized');
    }

    /**
     * Create performance monitor UI
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'perf-monitor';
        this.container.className = 'perf-monitor';
        this.container.innerHTML = `
            <div class="perf-monitor-header">
                <div class="perf-monitor-title">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Performance Monitor</span>
                </div>
                <div class="perf-monitor-controls">
                    <button id="perf-toggle-pin" class="perf-control-btn" title="Toggle Pin">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                    <button id="perf-toggle-close" class="perf-control-btn" title="Close">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="perf-monitor-content">
                <!-- Main Metrics -->
                <div class="perf-metrics-grid">
                    <div class="perf-metric" id="perf-fps-metric">
                        <div class="perf-metric-label">FPS</div>
                        <div class="perf-metric-value" id="perf-fps-value">0</div>
                        <div class="perf-metric-status" id="perf-fps-status"></div>
                    </div>

                    <div class="perf-metric" id="perf-frame-metric">
                        <div class="perf-metric-label">Frame Time</div>
                        <div class="perf-metric-value" id="perf-frame-value">0ms</div>
                        <div class="perf-metric-status" id="perf-frame-status"></div>
                    </div>

                    <div class="perf-metric" id="perf-memory-metric">
                        <div class="perf-metric-label">Memory</div>
                        <div class="perf-metric-value" id="perf-memory-value">0MB</div>
                        <div class="perf-metric-status" id="perf-memory-status"></div>
                    </div>

                    <div class="perf-metric" id="perf-nodes-metric">
                        <div class="perf-metric-label">Nodes</div>
                        <div class="perf-metric-value" id="perf-nodes-value">0</div>
                        <div class="perf-metric-status" id="perf-nodes-status"></div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="perf-charts">
                    <div class="perf-chart">
                        <div class="perf-chart-label">FPS History</div>
                        <canvas id="perf-fps-chart" width="280" height="60"></canvas>
                    </div>

                    <div class="perf-chart">
                        <div class="perf-chart-label">Frame Time History</div>
                        <canvas id="perf-frametime-chart" width="280" height="60"></canvas>
                    </div>
                </div>

                <!-- Detailed Stats -->
                <div class="perf-stats" id="perf-stats">
                    <div class="perf-stat-row">
                        <span class="perf-stat-label">Visible Nodes:</span>
                        <span class="perf-stat-value" id="perf-visible-nodes">0</span>
                    </div>
                    <div class="perf-stat-row">
                        <span class="perf-stat-label">Dropped Frames:</span>
                        <span class="perf-stat-value" id="perf-dropped-frames">0</span>
                    </div>
                    <div class="perf-stat-row">
                        <span class="perf-stat-label">Render Time:</span>
                        <span class="perf-stat-value" id="perf-render-time">0ms</span>
                    </div>
                    <div class="perf-stat-row">
                        <span class="perf-stat-label">Health:</span>
                        <span class="perf-stat-value" id="perf-health">Good</span>
                    </div>
                </div>

                <!-- Recommendations -->
                <div class="perf-recommendations" id="perf-recommendations" style="display: none;">
                    <div class="perf-recommendations-title">Recommendations</div>
                    <div class="perf-recommendations-list" id="perf-recommendations-list"></div>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Append to body
        document.body.appendChild(this.container);

        // Initialize charts
        this.initCharts();

        // Hide by default
        this.hide();
    }

    /**
     * Add styles
     */
    addStyles() {
        if (document.getElementById('perf-monitor-styles')) return;

        const style = document.createElement('style');
        style.id = 'perf-monitor-styles';
        style.textContent = `
            .perf-monitor {
                position: fixed;
                top: 70px;
                right: 20px;
                width: 320px;
                background: rgba(15, 20, 25, 0.95);
                border: 1px solid #2a2f3e;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(10px);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                color: #e5e7eb;
                transition: opacity 0.2s ease;
            }

            .perf-monitor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #2a2f3e;
                cursor: move;
            }

            .perf-monitor-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
                color: #6366f1;
            }

            .perf-monitor-controls {
                display: flex;
                gap: 4px;
            }

            .perf-control-btn {
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .perf-control-btn:hover {
                background: #1a1f2e;
                color: #e5e7eb;
            }

            .perf-monitor-content {
                padding: 16px;
            }

            .perf-metrics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 16px;
            }

            .perf-metric {
                background: #1a1f2e;
                border: 1px solid #2a2f3e;
                border-radius: 6px;
                padding: 12px;
                text-align: center;
            }

            .perf-metric-label {
                font-size: 11px;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }

            .perf-metric-value {
                font-size: 24px;
                font-weight: 700;
                color: #e5e7eb;
                margin-bottom: 4px;
            }

            .perf-metric-status {
                height: 3px;
                background: #10b981;
                border-radius: 2px;
                transition: background 0.3s;
            }

            .perf-metric-status.warning {
                background: #f59e0b;
            }

            .perf-metric-status.critical {
                background: #ef4444;
            }

            .perf-charts {
                margin-bottom: 16px;
            }

            .perf-chart {
                background: #1a1f2e;
                border: 1px solid #2a2f3e;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .perf-chart:last-child {
                margin-bottom: 0;
            }

            .perf-chart-label {
                font-size: 11px;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }

            .perf-stats {
                background: #1a1f2e;
                border: 1px solid #2a2f3e;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .perf-stat-row {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                font-size: 12px;
                border-bottom: 1px solid #252a39;
            }

            .perf-stat-row:last-child {
                border-bottom: none;
            }

            .perf-stat-label {
                color: #9ca3af;
            }

            .perf-stat-value {
                color: #e5e7eb;
                font-weight: 600;
            }

            .perf-recommendations {
                background: #1a1f2e;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 12px;
            }

            .perf-recommendations-title {
                font-size: 12px;
                font-weight: 600;
                color: #f59e0b;
                margin-bottom: 8px;
            }

            .perf-recommendations-list {
                font-size: 11px;
                color: #d1d5db;
            }

            .perf-recommendation-item {
                padding: 6px 0;
                border-bottom: 1px solid #252a39;
            }

            .perf-recommendation-item:last-child {
                border-bottom: none;
            }

            .perf-recommendation-severity {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                margin-right: 6px;
            }

            .perf-recommendation-severity.warning {
                background: #f59e0b;
                color: #000;
            }

            .perf-recommendation-severity.critical {
                background: #ef4444;
                color: #fff;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Initialize charts
     */
    initCharts() {
        this.fpsChart = document.getElementById('perf-fps-chart').getContext('2d');
        this.frameTimeChart = document.getElementById('perf-frametime-chart').getContext('2d');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        document.getElementById('perf-toggle-close').addEventListener('click', () => {
            this.toggle();
        });

        // Listen for performance metrics
        window.addEventListener('performance:metrics', (event) => {
            this.updateMetrics(event.detail);
        });

        // Make draggable
        this.makeDraggable();
    }

    /**
     * Make monitor draggable
     */
    makeDraggable() {
        const header = this.container.querySelector('.perf-monitor-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - this.container.offsetLeft;
            initialY = e.clientY - this.container.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                this.container.style.left = currentX + 'px';
                this.container.style.top = currentY + 'px';
                this.container.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Start metric updates
     */
    startUpdates() {
        this.updateInterval = setInterval(() => {
            const metrics = this.perfEngine.getMetrics();
            this.updateMetrics(metrics);
        }, 1000);
    }

    /**
     * Update metrics display
     */
    updateMetrics(metrics) {
        // Update main metrics
        document.getElementById('perf-fps-value').textContent = metrics.fps;
        document.getElementById('perf-frame-value').textContent = metrics.avgFrameTime + 'ms';
        document.getElementById('perf-memory-value').textContent = metrics.memoryUsage + 'MB';
        document.getElementById('perf-nodes-value').textContent = metrics.nodeCount;

        // Update status bars
        this.updateStatusBar('perf-fps-status', metrics.fps, 60, 30);
        this.updateStatusBar('perf-frame-status', metrics.avgFrameTime, 16.67, 33, true);
        this.updateStatusBar('perf-memory-status', metrics.memoryUsage, 300, 500);
        this.updateStatusBar('perf-nodes-status', metrics.nodeCount, 500, 1000);

        // Update detailed stats
        document.getElementById('perf-visible-nodes').textContent = metrics.visibleNodes;
        document.getElementById('perf-dropped-frames').textContent = metrics.droppedFrames;
        document.getElementById('perf-render-time').textContent = metrics.renderTime.toFixed(2) + 'ms';
        document.getElementById('perf-health').textContent = this.getHealthLabel(metrics.health);

        // Update charts
        this.updateChart(this.charts.fps, metrics.fps, 0, 60);
        this.updateChart(this.charts.frameTime, parseFloat(metrics.avgFrameTime), 0, 50);

        this.drawChart(this.fpsChart, this.charts.fps, 60, '#10b981');
        this.drawChart(this.frameTimeChart, this.charts.frameTime, 50, '#3b82f6');

        // Update recommendations
        this.updateRecommendations(metrics);
    }

    /**
     * Update status bar
     */
    updateStatusBar(id, value, warningThreshold, criticalThreshold, inverse = false) {
        const element = document.getElementById(id);

        element.classList.remove('warning', 'critical');

        if (inverse) {
            if (value > criticalThreshold) {
                element.classList.add('critical');
            } else if (value > warningThreshold) {
                element.classList.add('warning');
            }
        } else {
            if (value > criticalThreshold) {
                element.classList.add('critical');
            } else if (value > warningThreshold) {
                element.classList.add('warning');
            }
        }
    }

    /**
     * Update chart data
     */
    updateChart(chartData, value, min, max) {
        chartData.push(value);

        if (chartData.length > this.maxDataPoints) {
            chartData.shift();
        }
    }

    /**
     * Draw chart
     */
    drawChart(ctx, data, maxValue, color) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) return;

        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const step = width / this.maxDataPoints;

        data.forEach((value, index) => {
            const x = index * step;
            const y = height - (value / maxValue) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw fill
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = color + '20';
        ctx.fill();
    }

    /**
     * Update recommendations
     */
    updateRecommendations(metrics) {
        const report = this.perfEngine.getReport();
        const recommendations = report.recommendations;

        const recContainer = document.getElementById('perf-recommendations');
        const recList = document.getElementById('perf-recommendations-list');

        if (recommendations.length === 0) {
            recContainer.style.display = 'none';
            return;
        }

        recContainer.style.display = 'block';
        recList.innerHTML = '';

        recommendations.forEach(rec => {
            const item = document.createElement('div');
            item.className = 'perf-recommendation-item';
            item.innerHTML = `
                <span class="perf-recommendation-severity ${rec.severity}">${rec.severity}</span>
                <div>${rec.message}</div>
                <ul style="margin-left: 20px; font-size: 10px; color: #9ca3af;">
                    ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            `;
            recList.appendChild(item);
        });
    }

    /**
     * Get health label
     */
    getHealthLabel(health) {
        const labels = {
            good: 'Good',
            warning: 'Warning',
            critical: 'Critical'
        };
        return labels[health] || 'Unknown';
    }

    /**
     * Show monitor
     */
    show() {
        this.container.style.display = 'block';
        this.isVisible = true;
    }

    /**
     * Hide monitor
     */
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Destroy monitor
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        if (this.container) {
            this.container.remove();
        }

        console.log('[PerformanceMonitor] Destroyed');
    }
}

// Export
window.PerformanceMonitor = PerformanceMonitor;
