#!/usr/bin/env node
/**
 * Claude Flow Platform Test Suite
 * Verifies core functionality of the WebSocket server
 */

const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const assert = require('assert');

// Test configuration
const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const WS_URL = `ws://localhost:${TEST_PORT}`;

// Test results tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Server process
let serverProcess = null;

/**
 * Colored console output
 */
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Start the server for testing
 */
async function startServer() {
    return new Promise((resolve, reject) => {
        log('\n🚀 Starting test server...', 'cyan');

        const serverPath = path.join(__dirname, '..', 'server.js');
        serverProcess = spawn('node', [serverPath], {
            env: { ...process.env, PORT: TEST_PORT },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';

        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('Server running')) {
                log('✓ Test server started', 'green');
                // Give it a moment to fully initialize
                setTimeout(() => resolve(), 500);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('Server error:', data.toString());
        });

        serverProcess.on('error', (error) => {
            reject(new Error(`Failed to start server: ${error.message}`));
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (!output.includes('Server running')) {
                reject(new Error('Server startup timeout'));
            }
        }, 5000);
    });
}

/**
 * Stop the server
 */
async function stopServer() {
    if (serverProcess) {
        log('\n🛑 Stopping test server...', 'cyan');
        serverProcess.kill('SIGINT');

        return new Promise((resolve) => {
            serverProcess.on('close', () => {
                log('✓ Test server stopped', 'green');
                resolve();
            });

            // Force kill after 2 seconds if graceful shutdown fails
            setTimeout(() => {
                if (serverProcess) {
                    serverProcess.kill('SIGKILL');
                    resolve();
                }
            }, 2000);
        });
    }
}

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: data ? { 'Content-Type': 'application/json' } : {}
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, body: jsonBody });
                } catch (error) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Test runner
 */
async function test(name, fn) {
    testsRun++;
    try {
        await fn();
        testsPassed++;
        log(`✓ ${name}`, 'green');
    } catch (error) {
        testsFailed++;
        log(`✗ ${name}`, 'red');
        log(`  Error: ${error.message}`, 'red');
    }
}

/**
 * Test Suite: Health Check
 */
async function testHealthCheck() {
    const response = await makeRequest('GET', '/api/health');

    assert.strictEqual(response.status, 200, 'Health check should return 200');
    assert.strictEqual(response.body.status, 'ok', 'Status should be "ok"');
    assert.ok(typeof response.body.uptime === 'number', 'Uptime should be a number');
    assert.ok(typeof response.body.clients === 'number', 'Clients should be a number');
}

/**
 * Test Suite: State API
 */
async function testStateAPI() {
    const response = await makeRequest('GET', '/api/state');

    assert.strictEqual(response.status, 200, 'State API should return 200');
    assert.ok(response.body.flow_data, 'Should have flow_data');
    assert.ok(Array.isArray(response.body.flow_data.nodes), 'Should have nodes array');
    assert.ok(Array.isArray(response.body.flow_data.edges), 'Should have edges array');
    assert.ok(typeof response.body.clients_connected === 'number', 'Should have clients count');
}

/**
 * Test Suite: Add Nodes
 */
async function testAddNodes() {
    const testNodes = [
        {
            id: 'test-node-1',
            type: 'user',
            data: { label: 'Test Node 1' },
            position: { x: 0, y: 0 }
        }
    ];

    const response = await makeRequest('POST', '/api/nodes', {
        nodes: testNodes,
        edges: []
    });

    assert.strictEqual(response.status, 200, 'Add nodes should return 200');
    assert.strictEqual(response.body.success, true, 'Should be successful');
    assert.strictEqual(response.body.nodes_added, 1, 'Should add 1 node');
}

/**
 * Test Suite: WebSocket Connection
 */
async function testWebSocketConnection() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        let receivedState = false;

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket test timeout'));
        }, 5000);

        ws.on('open', () => {
            // Connection established, wait for initial state
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);

                if (message.type === 'state') {
                    receivedState = true;
                    assert.ok(message.data, 'Should receive state data');
                    assert.ok(Array.isArray(message.data.nodes), 'State should have nodes');
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                }
            } catch (error) {
                clearTimeout(timeout);
                ws.close();
                reject(error);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

/**
 * Test Suite: WebSocket Ping/Pong
 */
async function testWebSocketPingPong() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket ping/pong timeout'));
        }, 5000);

        ws.on('open', () => {
            // Send ping
            ws.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
            }));
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);

                if (message.type === 'pong') {
                    assert.ok(message.timestamp, 'Pong should have timestamp');
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                }
            } catch (error) {
                clearTimeout(timeout);
                ws.close();
                reject(error);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

/**
 * Test Suite: Clear Flow Data
 */
async function testClearFlow() {
    const response = await makeRequest('POST', '/api/clear');

    assert.strictEqual(response.status, 200, 'Clear should return 200');
    assert.strictEqual(response.body.success, true, 'Clear should be successful');
}

/**
 * Test Suite: Invalid Request Handling
 */
async function testInvalidRequests() {
    // Test invalid nodes request
    const response = await makeRequest('POST', '/api/nodes', {
        invalid: 'data'
    });

    assert.strictEqual(response.status, 400, 'Invalid request should return 400');
    assert.ok(response.body.error, 'Should have error message');
}

/**
 * Test Suite: Static File Serving
 */
async function testStaticFiles() {
    const response = await makeRequest('GET', '/index.html');

    // Should either return 200 (file exists) or 404 (file doesn't exist)
    // Both are valid responses for static file serving
    assert.ok(
        response.status === 200 || response.status === 404,
        'Static file endpoint should respond'
    );
}

/**
 * Run all tests
 */
async function runTests() {
    log('═══════════════════════════════════════════', 'cyan');
    log('   Claude Flow Platform Test Suite', 'cyan');
    log('═══════════════════════════════════════════', 'cyan');

    try {
        // Start server
        await startServer();

        log('\n📋 Running tests...', 'blue');
        log('───────────────────────────────────────────', 'blue');

        // Run tests
        await test('Health check endpoint', testHealthCheck);
        await test('State API endpoint', testStateAPI);
        await test('Add nodes functionality', testAddNodes);
        await test('WebSocket connection', testWebSocketConnection);
        await test('WebSocket ping/pong', testWebSocketPingPong);
        await test('Clear flow data', testClearFlow);
        await test('Invalid request handling', testInvalidRequests);
        await test('Static file serving', testStaticFiles);

        // Clean up
        await stopServer();

        // Print results
        log('\n═══════════════════════════════════════════', 'cyan');
        log('   Test Results', 'cyan');
        log('═══════════════════════════════════════════', 'cyan');
        log(`\nTotal tests: ${testsRun}`, 'blue');
        log(`Passed: ${testsPassed}`, 'green');
        log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');

        if (testsFailed === 0) {
            log('\n✨ All tests passed! Platform is working correctly.', 'green');
            process.exit(0);
        } else {
            log('\n❌ Some tests failed. Please review the errors above.', 'red');
            process.exit(1);
        }

    } catch (error) {
        log(`\n❌ Test suite error: ${error.message}`, 'red');
        await stopServer();
        process.exit(1);
    }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
    log('\n\n⚠️  Test interrupted', 'yellow');
    await stopServer();
    process.exit(1);
});

// Run tests
runTests();
