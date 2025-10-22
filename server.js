#!/usr/bin/env node
/**
 * Claude Flow WebSocket Server
 * Real-time node communication server with file backup
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const FLOW_FILE = path.join(DATA_DIR, 'flow.json');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Set();

// In-memory flow data
let flowData = {
    conversation_id: null,
    created_at: new Date().toISOString(),
    nodes: [],
    edges: []
};

/**
 * Message Protocol Types
 */
const MessageType = {
    // Client -> Server
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    REQUEST_STATE: 'request_state',

    // Server -> Client
    STATE: 'state',
    NODE_UPDATE: 'node_update',
    EDGE_UPDATE: 'edge_update',
    CLEAR: 'clear',
    ERROR: 'error',

    // Bidirectional
    PING: 'ping',
    PONG: 'pong'
};

/**
 * Initialize data directory
 */
async function initDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`Data directory initialized: ${DATA_DIR}`);
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

/**
 * Load existing flow data from file
 */
async function loadFlowData() {
    try {
        const data = await fs.readFile(FLOW_FILE, 'utf8');
        flowData = JSON.parse(data);
        console.log(`Loaded flow data: ${flowData.nodes.length} nodes, ${flowData.edges.length} edges`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No existing flow data found, starting fresh');
        } else {
            console.error('Error loading flow data:', error);
        }
    }
}

/**
 * Save flow data to file (for persistence)
 */
async function saveFlowData() {
    try {
        await fs.writeFile(FLOW_FILE, JSON.stringify(flowData, null, 2), 'utf8');
        console.log(`Saved flow data: ${flowData.nodes.length} nodes, ${flowData.edges.length} edges`);
    } catch (error) {
        console.error('Error saving flow data:', error);
    }
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(message, excludeClient = null) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
            sentCount++;
        }
    });

    return sentCount;
}

/**
 * Send message to specific client
 */
function sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        return true;
    }
    return false;
}

/**
 * Validate message structure
 */
function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        return { valid: false, error: 'Invalid message format' };
    }

    if (!message.type || !Object.values(MessageType).includes(message.type)) {
        return { valid: false, error: 'Invalid message type' };
    }

    return { valid: true };
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(client, message) {
    try {
        const data = JSON.parse(message);
        const validation = validateMessage(data);

        if (!validation.valid) {
            sendToClient(client, {
                type: MessageType.ERROR,
                error: validation.error
            });
            return;
        }

        switch (data.type) {
            case MessageType.SUBSCRIBE:
                // Client is subscribing (already added to clients set on connection)
                console.log('Client subscribed');
                break;

            case MessageType.UNSUBSCRIBE:
                // Client is unsubscribing
                clients.delete(client);
                console.log(`Client unsubscribed. Active clients: ${clients.size}`);
                break;

            case MessageType.REQUEST_STATE:
                // Send current state to client
                sendToClient(client, {
                    type: MessageType.STATE,
                    data: flowData,
                    timestamp: new Date().toISOString()
                });
                console.log('Sent current state to client');
                break;

            case MessageType.NODE_UPDATE:
                // Handle node update
                if (data.nodes) {
                    flowData.nodes.push(...data.nodes);
                    broadcast({
                        type: MessageType.NODE_UPDATE,
                        nodes: data.nodes,
                        timestamp: new Date().toISOString()
                    }, client);
                    saveFlowData();
                }
                break;

            case MessageType.EDGE_UPDATE:
                // Handle edge update
                if (data.edges) {
                    flowData.edges.push(...data.edges);
                    broadcast({
                        type: MessageType.EDGE_UPDATE,
                        edges: data.edges,
                        timestamp: new Date().toISOString()
                    }, client);
                    saveFlowData();
                }
                break;

            case MessageType.CLEAR:
                // Clear flow data
                flowData = {
                    conversation_id: null,
                    created_at: new Date().toISOString(),
                    nodes: [],
                    edges: []
                };
                broadcast({
                    type: MessageType.CLEAR,
                    timestamp: new Date().toISOString()
                });
                saveFlowData();
                console.log('Flow data cleared');
                break;

            case MessageType.PING:
                // Respond to ping
                sendToClient(client, {
                    type: MessageType.PONG,
                    timestamp: new Date().toISOString()
                });
                break;

            default:
                console.log(`Unknown message type: ${data.type}`);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendToClient(client, {
            type: MessageType.ERROR,
            error: 'Failed to process message'
        });
    }
}

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${clientIp}`);

    // Add to clients set
    clients.add(ws);
    console.log(`Active clients: ${clients.size}`);

    // Send current state to new client
    sendToClient(ws, {
        type: MessageType.STATE,
        data: flowData,
        timestamp: new Date().toISOString()
    });

    // Handle messages
    ws.on('message', (message) => {
        handleMessage(ws, message);
    });

    // Handle client disconnect
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`Client disconnected. Active clients: ${clients.size}`);
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            sendToClient(ws, {
                type: MessageType.PING,
                timestamp: new Date().toISOString()
            });
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);
});

/**
 * Serve static files
 */
app.use(express.static(__dirname));

/**
 * API endpoint to add nodes (for Claude Code bridge)
 */
app.use(express.json());

app.post('/api/nodes', async (req, res) => {
    try {
        const { nodes, edges } = req.body;

        if (!nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Invalid nodes data' });
        }

        // Add nodes to flow data
        flowData.nodes.push(...nodes);

        // Add edges if provided
        if (edges && Array.isArray(edges)) {
            flowData.edges.push(...edges);
        }

        // Broadcast to all clients
        const sentCount = broadcast({
            type: MessageType.NODE_UPDATE,
            nodes: nodes,
            edges: edges || [],
            timestamp: new Date().toISOString()
        });

        // Save to file
        await saveFlowData();

        res.json({
            success: true,
            nodes_added: nodes.length,
            edges_added: edges ? edges.length : 0,
            clients_notified: sentCount
        });
    } catch (error) {
        console.error('Error adding nodes:', error);
        res.status(500).json({ error: 'Failed to add nodes' });
    }
});

/**
 * API endpoint to clear flow data
 */
app.post('/api/clear', async (req, res) => {
    try {
        flowData = {
            conversation_id: null,
            created_at: new Date().toISOString(),
            nodes: [],
            edges: []
        };

        broadcast({
            type: MessageType.CLEAR,
            timestamp: new Date().toISOString()
        });

        await saveFlowData();

        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing flow data:', error);
        res.status(500).json({ error: 'Failed to clear flow data' });
    }
});

/**
 * API endpoint to get current state
 */
app.get('/api/state', (req, res) => {
    res.json({
        flow_data: flowData,
        clients_connected: clients.size,
        timestamp: new Date().toISOString()
    });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        clients: clients.size,
        nodes: flowData.nodes.length,
        edges: flowData.edges.length
    });
});

/**
 * Start server
 */
async function start() {
    console.log('Claude Flow WebSocket Server');
    console.log('============================');

    // Initialize
    await initDataDir();
    await loadFlowData();

    // Start server
    server.listen(PORT, () => {
        console.log(`\nServer running on http://localhost:${PORT}`);
        console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
        console.log(`\nAPI Endpoints:`);
        console.log(`  POST /api/nodes   - Add nodes`);
        console.log(`  POST /api/clear   - Clear flow data`);
        console.log(`  GET  /api/state   - Get current state`);
        console.log(`  GET  /api/health  - Health check`);
        console.log(`\nPress Ctrl+C to stop`);
    });
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');

    // Save data
    await saveFlowData();

    // Close all client connections
    clients.forEach(client => {
        client.close();
    });

    // Close server
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});

// Start the server
start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
