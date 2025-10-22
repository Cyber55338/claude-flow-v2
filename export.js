/**
 * Export.js - Export Engine for Claude Flow
 * Supports PNG, SVG, JSON, and Markdown exports
 * High-quality exports with customizable options
 */

class ExportEngine {
    constructor(canvas, parser) {
        this.canvas = canvas;
        this.parser = parser;
        this.exportOptions = {
            png: {
                scale: 3, // 3x for 300 DPI equivalent
                quality: 0.95,
                backgroundColor: '#0a0e1a',
                includeBackground: true
            },
            svg: {
                includeBackground: true,
                embedFonts: true,
                backgroundColor: '#0a0e1a'
            },
            json: {
                prettyPrint: true,
                includeMetadata: true,
                indent: 2
            },
            markdown: {
                includeMetadata: true,
                includeTimestamps: true,
                codeBlockStyle: 'fenced' // 'fenced' or 'indented'
            }
        };
    }

    /**
     * Export canvas as PNG
     * Uses html2canvas for high-quality rendering
     */
    async exportToPNG(options = {}) {
        const config = { ...this.exportOptions.png, ...options };

        try {
            // Get the SVG element
            const svgElement = this.canvas.svg;
            const bbox = svgElement.getBBox ? svgElement.getBBox() : null;

            // Create a canvas element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calculate dimensions
            const width = bbox ? bbox.width + bbox.x * 2 : svgElement.clientWidth;
            const height = bbox ? bbox.height + bbox.y * 2 : svgElement.clientHeight;

            canvas.width = width * config.scale;
            canvas.height = height * config.scale;

            // Scale context for high DPI
            ctx.scale(config.scale, config.scale);

            // Draw background if requested
            if (config.includeBackground) {
                ctx.fillStyle = config.backgroundColor;
                ctx.fillRect(0, 0, width, height);
            }

            // Convert SVG to image
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const img = new Image();

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create PNG blob'));
                        }
                    }, 'image/png', config.quality);
                };

                img.onerror = (err) => {
                    reject(new Error('Failed to load SVG as image: ' + err));
                };

                // Create data URL
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                img.src = url;
            });
        } catch (error) {
            console.error('PNG export failed:', error);
            throw error;
        }
    }

    /**
     * Export canvas as SVG
     */
    async exportToSVG(options = {}) {
        const config = { ...this.exportOptions.svg, ...options };

        try {
            const svgElement = this.canvas.svg.cloneNode(true);

            // Add background if requested
            if (config.includeBackground) {
                const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bgRect.setAttribute('width', '100%');
                bgRect.setAttribute('height', '100%');
                bgRect.setAttribute('fill', config.backgroundColor);
                svgElement.insertBefore(bgRect, svgElement.firstChild);
            }

            // Embed fonts if requested
            if (config.embedFonts) {
                const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                style.textContent = `
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
                    text { font-family: 'Inter', sans-serif; }
                `;
                svgElement.insertBefore(style, svgElement.firstChild);
            }

            // Serialize SVG
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);

            // Add XML declaration
            const svgData = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

            // Create blob
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            return blob;
        } catch (error) {
            console.error('SVG export failed:', error);
            throw error;
        }
    }

    /**
     * Export flow data as JSON
     */
    async exportToJSON(flowData, options = {}) {
        const config = { ...this.exportOptions.json, ...options };

        try {
            const exportData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                metadata: config.includeMetadata ? {
                    nodeCount: flowData.nodes ? flowData.nodes.length : 0,
                    edgeCount: flowData.edges ? flowData.edges.length : 0,
                    exportEngine: 'Claude Flow Export Engine v1.0'
                } : undefined,
                data: flowData
            };

            // Remove undefined metadata if not included
            if (!config.includeMetadata) {
                delete exportData.metadata;
            }

            // Stringify with optional pretty printing
            const jsonString = config.prettyPrint
                ? JSON.stringify(exportData, null, config.indent)
                : JSON.stringify(exportData);

            // Create blob
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            return blob;
        } catch (error) {
            console.error('JSON export failed:', error);
            throw error;
        }
    }

    /**
     * Export conversation as Markdown
     */
    async exportToMarkdown(flowData, options = {}) {
        const config = { ...this.exportOptions.markdown, ...options };

        try {
            let markdown = '# Claude Flow Conversation\n\n';

            // Add metadata
            if (config.includeMetadata) {
                markdown += '## Metadata\n\n';
                markdown += `- **Exported:** ${new Date().toISOString()}\n`;
                markdown += `- **Node Count:** ${flowData.nodes ? flowData.nodes.length : 0}\n`;
                markdown += `- **Edge Count:** ${flowData.edges ? flowData.edges.length : 0}\n`;
                markdown += '\n---\n\n';
            }

            // Add nodes as conversation flow
            if (flowData.nodes && flowData.nodes.length > 0) {
                markdown += '## Conversation Flow\n\n';

                flowData.nodes.forEach((node, index) => {
                    // Add timestamp if requested
                    if (config.includeTimestamps && node.timestamp) {
                        markdown += `**[${new Date(node.timestamp).toLocaleString()}]**\n\n`;
                    }

                    // Add node type and title
                    const emoji = this.getNodeEmoji(node.type);
                    markdown += `### ${emoji} ${node.type.charAt(0).toUpperCase() + node.type.slice(1)}: ${node.id}\n\n`;

                    // Add node content
                    if (node.label) {
                        markdown += `**${node.label}**\n\n`;
                    }

                    if (node.content) {
                        if (config.codeBlockStyle === 'fenced') {
                            markdown += '```\n';
                            markdown += node.content;
                            markdown += '\n```\n\n';
                        } else {
                            markdown += node.content.split('\n').map(line => '    ' + line).join('\n');
                            markdown += '\n\n';
                        }
                    }

                    // Add metadata if available
                    if (node.metadata) {
                        markdown += '_Metadata:_ ';
                        markdown += Object.entries(node.metadata)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(', ');
                        markdown += '\n\n';
                    }

                    markdown += '---\n\n';
                });
            }

            // Create blob
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            return blob;
        } catch (error) {
            console.error('Markdown export failed:', error);
            throw error;
        }
    }

    /**
     * Get emoji for node type
     */
    getNodeEmoji(type) {
        const emojis = {
            input: '📝',
            output: '💬',
            skill: '⚡',
            auto: '🤖',
            thought: '💭',
            action: '🎯',
            result: '✅',
            error: '❌'
        };
        return emojis[type] || '🔹';
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Download failed:', error);
            return false;
        }
    }

    /**
     * Export and download as PNG
     */
    async exportAndDownloadPNG(filename, options = {}) {
        try {
            const blob = await this.exportToPNG(options);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const finalFilename = filename || `claude-flow-${timestamp}.png`;
            return this.downloadBlob(blob, finalFilename);
        } catch (error) {
            console.error('Export to PNG failed:', error);
            throw error;
        }
    }

    /**
     * Export and download as SVG
     */
    async exportAndDownloadSVG(filename, options = {}) {
        try {
            const blob = await this.exportToSVG(options);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const finalFilename = filename || `claude-flow-${timestamp}.svg`;
            return this.downloadBlob(blob, finalFilename);
        } catch (error) {
            console.error('Export to SVG failed:', error);
            throw error;
        }
    }

    /**
     * Export and download as JSON
     */
    async exportAndDownloadJSON(flowData, filename, options = {}) {
        try {
            const blob = await this.exportToJSON(flowData, options);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const finalFilename = filename || `claude-flow-${timestamp}.json`;
            return this.downloadBlob(blob, finalFilename);
        } catch (error) {
            console.error('Export to JSON failed:', error);
            throw error;
        }
    }

    /**
     * Export and download as Markdown
     */
    async exportAndDownloadMarkdown(flowData, filename, options = {}) {
        try {
            const blob = await this.exportToMarkdown(flowData, options);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const finalFilename = filename || `claude-flow-${timestamp}.md`;
            return this.downloadBlob(blob, finalFilename);
        } catch (error) {
            console.error('Export to Markdown failed:', error);
            throw error;
        }
    }

    /**
     * Get current flow data from canvas
     */
    getCurrentFlowData() {
        return {
            nodes: this.canvas.nodes || [],
            edges: this.canvas.edges || [],
            canvasState: {
                zoom: this.canvas.zoom,
                panX: this.canvas.panX,
                panY: this.canvas.panY
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Export all formats (for debugging/testing)
     */
    async exportAll(baseName = 'claude-flow') {
        const flowData = this.getCurrentFlowData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const results = [];

        try {
            results.push({
                format: 'PNG',
                success: await this.exportAndDownloadPNG(`${baseName}-${timestamp}.png`)
            });
        } catch (e) {
            results.push({ format: 'PNG', success: false, error: e.message });
        }

        try {
            results.push({
                format: 'SVG',
                success: await this.exportAndDownloadSVG(`${baseName}-${timestamp}.svg`)
            });
        } catch (e) {
            results.push({ format: 'SVG', success: false, error: e.message });
        }

        try {
            results.push({
                format: 'JSON',
                success: await this.exportAndDownloadJSON(flowData, `${baseName}-${timestamp}.json`)
            });
        } catch (e) {
            results.push({ format: 'JSON', success: false, error: e.message });
        }

        try {
            results.push({
                format: 'Markdown',
                success: await this.exportAndDownloadMarkdown(flowData, `${baseName}-${timestamp}.md`)
            });
        } catch (e) {
            results.push({ format: 'Markdown', success: false, error: e.message });
        }

        return results;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ExportEngine = ExportEngine;
}
