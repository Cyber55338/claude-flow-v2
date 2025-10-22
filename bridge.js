#!/usr/bin/env node
/**
 * Claude Flow Bridge
 * Send nodes to WebSocket server via HTTP API
 * Usage: node bridge.js <input-text> <output-text>
 */

const http = require('http');

// Configuration
const HOST = process.env.CLAUDE_FLOW_HOST || 'localhost';
const PORT = process.env.CLAUDE_FLOW_PORT || 3000;

// Simple parser (inline version)
class SimpleParser {
    constructor() {
        this.nodeIdCounter = 1;
    }

    generateId() {
        return `node-${this.nodeIdCounter++}`;
    }

    parseInteraction(inputText, outputText) {
        const nodes = [];
        const edges = [];

        // Create input node
        const inputNode = {
            id: this.generateId(),
            type: 'input',
            content: inputText,
            parent_id: null,
            timestamp: new Date().toISOString()
        };
        nodes.push(inputNode);

        // Create output node
        const outputNode = {
            id: this.generateId(),
            type: 'output',
            content: outputText,
            parent_id: inputNode.id,
            timestamp: new Date().toISOString()
        };
        nodes.push(outputNode);

        // Create edge
        edges.push({
            from: inputNode.id,
            to: outputNode.id
        });

        return { nodes, edges };
    }
}

/**
 * Send nodes to server
 */
function sendNodes(nodes, edges) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ nodes, edges });

        const options = {
            hostname: HOST,
            port: PORT,
            path: '/api/nodes',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(responseData));
                } else {
                    reject(new Error(`Server returned ${res.statusCode}: ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node bridge.js <input-text> <output-text>');
        console.error('');
        console.error('Environment variables:');
        console.error('  CLAUDE_FLOW_HOST - Server host (default: localhost)');
        console.error('  CLAUDE_FLOW_PORT - Server port (default: 3000)');
        process.exit(1);
    }

    const inputText = args[0];
    const outputText = args[1];

    console.log('Claude Flow Bridge');
    console.log('==================');
    console.log(`Server: ${HOST}:${PORT}`);
    console.log(`Input: ${inputText.substring(0, 50)}...`);
    console.log(`Output: ${outputText.substring(0, 50)}...`);
    console.log('');

    try {
        // Parse interaction
        const parser = new SimpleParser();
        const { nodes, edges } = parser.parseInteraction(inputText, outputText);

        console.log(`Parsed ${nodes.length} nodes and ${edges.length} edges`);

        // Send to server
        const result = await sendNodes(nodes, edges);

        console.log('Success!');
        console.log(`  Nodes added: ${result.nodes_added}`);
        console.log(`  Edges added: ${result.edges_added}`);
        console.log(`  Clients notified: ${result.clients_notified}`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { sendNodes, SimpleParser };
