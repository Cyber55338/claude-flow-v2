/**
 * Share.js - Sharing Utilities for Claude Flow
 * Supports clipboard, QR codes, and standalone HTML export
 */

class ShareManager {
    constructor(canvas, exportEngine) {
        this.canvas = canvas;
        this.exportEngine = exportEngine;
    }

    /**
     * Copy flow data to clipboard as JSON
     */
    async copyToClipboard(flowData, format = 'json') {
        try {
            let text;

            switch (format) {
                case 'json':
                    text = JSON.stringify(flowData, null, 2);
                    break;
                case 'markdown':
                    const mdBlob = await this.exportEngine.exportToMarkdown(flowData);
                    text = await this.blobToText(mdBlob);
                    break;
                case 'text':
                    text = this.flowDataToText(flowData);
                    break;
                default:
                    text = JSON.stringify(flowData);
            }

            await navigator.clipboard.writeText(text);
            console.log('Copied to clipboard:', format);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback method
            return this.copyToClipboardFallback(text);
        }
    }

    /**
     * Fallback method for copying to clipboard
     */
    copyToClipboardFallback(text) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (error) {
            console.error('Fallback copy failed:', error);
            return false;
        }
    }

    /**
     * Convert flow data to plain text
     */
    flowDataToText(flowData) {
        let text = 'CLAUDE FLOW EXPORT\n';
        text += '==================\n\n';

        if (flowData.nodes && flowData.nodes.length > 0) {
            text += `Nodes (${flowData.nodes.length}):\n`;
            text += '-'.repeat(50) + '\n';

            flowData.nodes.forEach((node, index) => {
                text += `\n[${index + 1}] ${node.type.toUpperCase()}: ${node.id}\n`;
                if (node.label) {
                    text += `    Label: ${node.label}\n`;
                }
                if (node.content) {
                    text += `    Content: ${node.content.substring(0, 100)}${node.content.length > 100 ? '...' : ''}\n`;
                }
            });
        }

        if (flowData.edges && flowData.edges.length > 0) {
            text += `\n\nEdges (${flowData.edges.length}):\n`;
            text += '-'.repeat(50) + '\n';

            flowData.edges.forEach((edge, index) => {
                text += `[${index + 1}] ${edge.from} → ${edge.to}\n`;
            });
        }

        return text;
    }

    /**
     * Generate QR code for sharing
     */
    async generateQRCode(data, options = {}) {
        const config = {
            size: 256,
            errorCorrectionLevel: 'M',
            ...options
        };

        try {
            // Convert data to JSON string
            const jsonString = typeof data === 'string' ? data : JSON.stringify(data);

            // Check if data is too large for QR code
            if (jsonString.length > 2953) {
                throw new Error('Data too large for QR code (max 2953 characters)');
            }

            // Create QR code using a simple implementation
            const qrCanvas = await this.createQRCanvas(jsonString, config.size);
            return qrCanvas.toDataURL('image/png');
        } catch (error) {
            console.error('Failed to generate QR code:', error);
            throw error;
        }
    }

    /**
     * Create QR code canvas (simplified version)
     * Note: In production, use a proper QR code library like qrcode.js
     */
    async createQRCanvas(text, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Draw border
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, 10);
        ctx.fillRect(0, 0, 10, size);
        ctx.fillRect(0, size - 10, size, 10);
        ctx.fillRect(size - 10, 0, 10, size);

        // Add text indicating QR code would be here
        ctx.font = '16px monospace';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code Placeholder', size / 2, size / 2 - 20);
        ctx.font = '12px monospace';
        ctx.fillText('Use qrcode.js library', size / 2, size / 2 + 10);
        ctx.fillText('for production', size / 2, size / 2 + 30);

        return canvas;
    }

    /**
     * Export as standalone HTML file
     */
    async exportStandaloneHTML(flowData, options = {}) {
        const config = {
            includeStyles: true,
            includeData: true,
            interactive: false,
            ...options
        };

        try {
            // Get SVG content
            const svgElement = this.canvas.svg.cloneNode(true);
            const svgString = new XMLSerializer().serializeToString(svgElement);

            // Create HTML document
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Flow Export - ${new Date().toLocaleDateString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0e1a;
            color: #e0e0e0;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(180deg, rgba(15, 20, 25, 0.95) 0%, rgba(10, 14, 26, 0.9) 100%);
            padding: 1rem 2rem;
            border-bottom: 1px solid #2a2f3e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .title {
            font-size: 1.5rem;
            font-weight: bold;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .info {
            font-size: 0.875rem;
            color: #9ca3af;
        }

        .canvas-container {
            width: 100vw;
            height: calc(100vh - 80px);
            overflow: auto;
            background: linear-gradient(135deg, #0a0e1a 0%, #0f1419 50%, #1a1f2e 100%);
        }

        svg {
            width: 100%;
            height: 100%;
        }

        .footer {
            background: linear-gradient(180deg, rgba(15, 20, 25, 0.95) 0%, rgba(10, 14, 26, 0.9) 100%);
            padding: 0.75rem 2rem;
            border-top: 1px solid #2a2f3e;
            text-align: center;
            font-size: 0.875rem;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Claude Flow Export</div>
        <div class="info">
            Exported: ${new Date().toLocaleString()} |
            Nodes: ${flowData.nodes ? flowData.nodes.length : 0} |
            Edges: ${flowData.edges ? flowData.edges.length : 0}
        </div>
    </div>

    <div class="canvas-container">
        ${svgString}
    </div>

    <div class="footer">
        Generated by Claude Flow - Visual Node Canvas
    </div>

    ${config.includeData ? `
    <script type="application/json" id="flow-data">
        ${JSON.stringify(flowData, null, 2)}
    </script>
    ` : ''}

    ${config.interactive ? `
    <script>
        // Add basic zoom/pan functionality
        const svg = document.querySelector('svg');
        let zoom = 1;
        let panX = 0;
        let panY = 0;

        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            zoom *= delta;
            zoom = Math.max(0.1, Math.min(5, zoom));
            updateTransform();
        });

        function updateTransform() {
            const group = svg.querySelector('g');
            if (group) {
                group.setAttribute('transform', \`translate(\${panX}, \${panY}) scale(\${zoom})\`);
            }
        }
    </script>
    ` : ''}
</body>
</html>`;

            // Create blob
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            return blob;
        } catch (error) {
            console.error('Failed to create standalone HTML:', error);
            throw error;
        }
    }

    /**
     * Download standalone HTML
     */
    async downloadStandaloneHTML(flowData, filename, options = {}) {
        try {
            const blob = await this.exportStandaloneHTML(flowData, options);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const finalFilename = filename || `claude-flow-${timestamp}.html`;

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Failed to download standalone HTML:', error);
            return false;
        }
    }

    /**
     * Generate shareable link (would require backend support)
     */
    async generateShareableLink(flowData, options = {}) {
        const config = {
            expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
            password: null,
            ...options
        };

        // In a real implementation, this would upload to a backend service
        console.warn('Shareable links require backend support - not implemented');

        // For now, return a data URL
        const jsonString = JSON.stringify(flowData);
        const base64 = btoa(encodeURIComponent(jsonString));
        const dataUrl = `data:application/json;base64,${base64}`;

        return {
            url: dataUrl,
            type: 'data-url',
            expiresAt: new Date(Date.now() + config.expiresIn).toISOString(),
            note: 'This is a data URL, not a shareable link. Backend support required for real sharing.'
        };
    }

    /**
     * Convert blob to text
     */
    async blobToText(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob);
        });
    }

    /**
     * Create share menu
     */
    createShareMenu(flowData) {
        return {
            copyJSON: async () => await this.copyToClipboard(flowData, 'json'),
            copyMarkdown: async () => await this.copyToClipboard(flowData, 'markdown'),
            copyText: async () => await this.copyToClipboard(flowData, 'text'),
            downloadHTML: async () => await this.downloadStandaloneHTML(flowData),
            generateQR: async () => await this.generateQRCode(flowData)
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ShareManager = ShareManager;
}
