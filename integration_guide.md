# Terminal → Canvas Real-Time Integration Guide
## Best Practices & Implementation Patterns

---

## 1. CRITICAL INTEGRATION POINT (createNodes Function)

### Current Implementation Analysis

**Location**: `/data/data/com.termux/files/home/claude-flow/terminal-input.js` (Lines 201-235)

**Current Code**:
```javascript
createNodes(userMessage, assistantResponse) {
    // Use the parser to create nodes
    if (!window.parser) {
        console.warn('Parser not available');
        return;
    }

    const result = window.parser.parseInteraction(userMessage, assistantResponse);

    // Send to server if WebSocket available
    if (window.app && window.app.ws && window.app.ws.readyState === WebSocket.OPEN) {
        window.app.sendMessage({
            type: 'node_update',
            nodes: result.nodes,
            edges: result.edges
        });
    } else {
        // Fallback: update canvas directly
        if (window.app && window.app.canvas) {
            const currentData = window.app.canvas.getData();
            const mergedData = {
                conversation_id: currentData.conversation_id || 'terminal-session',
                created_at: currentData.created_at || new Date().toISOString(),
                nodes: [...currentData.nodes, ...result.nodes],
                edges: [...currentData.edges, ...result.edges]
            };
            window.app.canvas.render(mergedData);
        }
    }

    // Show success message
    if (window.ui) {
        window.ui.success('Nodes Created', `${result.nodes.length} node(s) added to canvas`);
    }
}
```

### Issues Identified

| Issue | Line | Severity | Impact |
|-------|------|----------|--------|
| No return value check on sendMessage() | 212 | HIGH | Silent failure - nodes sent but never rendered |
| No error handling on render() | 227 | HIGH | Render error not caught or reported |
| Stale connection state | 211 | MEDIUM | Connection could close between check and send |
| No message ID/tracking | 212-216 | MEDIUM | Can't verify message delivery |
| Simple node merge (array concat) | 224 | MEDIUM | Potential duplicates if client re-renders |
| No timeout on message | N/A | LOW | Could wait indefinitely for response |

---

## 2. RECOMMENDED IMPROVEMENTS

### Improvement 1: Add Error Handling & Fallback

**Problem**: sendMessage() return value is ignored

**Current**:
```javascript
window.app.sendMessage({...});  // Returns bool, ignored!
```

**Better**:
```javascript
const sent = window.app.sendMessage({
    type: 'node_update',
    nodes: result.nodes,
    edges: result.edges
});

if (!sent) {
    console.log('WebSocket unavailable, using fallback');
    this.renderNodesFallback(result);
}
```

### Improvement 2: Message Tracking with ID

**Add message ID for verification**:
```javascript
createNodes(userMessage, assistantResponse) {
    const result = window.parser.parseInteraction(userMessage, assistantResponse);
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (window.app && window.app.ws && window.app.ws.readyState === WebSocket.OPEN) {
        const sent = window.app.sendMessage({
            type: 'node_update',
            id: messageId,  // Track this message
            nodes: result.nodes,
            edges: result.edges
        });

        if (!sent) {
            this.renderNodesFallback(result);
            this.showWarning('Connection unstable, using local rendering');
        } else {
            console.log(`Message ${messageId} sent successfully`);
        }
    } else {
        this.renderNodesFallback(result);
    }
}
```

### Improvement 3: Deduplicated Local Merge

**Better merging strategy**:
```javascript
renderNodesFallback(result) {
    if (!window.app || !window.app.canvas) return;

    const currentData = window.app.canvas.getData();
    
    // Deduplicate: only add nodes that don't already exist
    const existingIds = new Set(currentData.nodes.map(n => n.id));
    const newNodes = result.nodes.filter(n => !existingIds.has(n.id));
    const newEdges = result.edges.filter(e => {
        // Only include edges where both nodes exist
        const allNodeIds = [...currentData.nodes, ...newNodes].map(n => n.id);
        return allNodeIds.includes(e.from) && allNodeIds.includes(e.to);
    });

    const mergedData = {
        conversation_id: currentData.conversation_id || 'terminal-session',
        created_at: currentData.created_at || new Date().toISOString(),
        nodes: [...currentData.nodes, ...newNodes],
        edges: [...currentData.edges, ...newEdges]
    };

    try {
        window.app.canvas.render(mergedData);
        console.log(`Rendered ${newNodes.length} new nodes (fallback)`);
    } catch (error) {
        console.error('Canvas render failed:', error);
        this.showError('Failed to render nodes');
    }
}
```

### Improvement 4: Separate Concerns

**Extract into reusable methods**:
```javascript
async createNodes(userMessage, assistantResponse) {
    const result = window.parser.parseInteraction(userMessage, assistantResponse);
    const messageId = this.generateMessageId();

    try {
        // Try primary path (WebSocket)
        if (await this.sendNodesViaWebSocket(result, messageId)) {
            return; // Success
        }

        // Fallback path
        this.renderNodesLocally(result);

    } catch (error) {
        console.error('Error creating nodes:', error);
        this.renderNodesLocally(result);
        this.showError(`Failed to create nodes: ${error.message}`);
    }
}

async sendNodesViaWebSocket(result, messageId) {
    if (!this.isWebSocketAvailable()) {
        return false;
    }

    const sent = window.app.sendMessage({
        type: 'node_update',
        id: messageId,
        nodes: result.nodes,
        edges: result.edges
    });

    if (!sent) {
        return false;
    }

    console.log(`Nodes sent via WebSocket (ID: ${messageId})`);
    return true;
}

renderNodesLocally(result) {
    if (!window.app?.canvas) return;

    try {
        const currentData = window.app.canvas.getData();
        const mergedData = {
            conversation_id: currentData.conversation_id || 'terminal-session',
            created_at: currentData.created_at || new Date().toISOString(),
            nodes: [...currentData.nodes, ...result.nodes],
            edges: [...currentData.edges, ...result.edges]
        };

        window.app.canvas.render(mergedData);
        console.log(`Rendered ${result.nodes.length} nodes locally`);
    } catch (error) {
        console.error('Local render failed:', error);
        throw error;
    }
}

isWebSocketAvailable() {
    return window.app?.ws?.readyState === WebSocket.OPEN;
}

generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

showError(message) {
    if (window.ui) {
        window.ui.error('Error', message);
    }
}
```

---

## 3. CONNECTION STATE MACHINE

### Recommended State Management

```javascript
class ConnectionStateManager {
    constructor(app) {
        this.app = app;
        this.state = 'DISCONNECTED';
        this.lastStateChange = Date.now();
        this.messageQueue = [];
        this.listeners = [];
    }

    get isConnected() {
        return this.state === 'CONNECTED';
    }

    get canSend() {
        return this.isConnected;
    }

    setState(newState) {
        if (this.state === newState) return;

        const oldState = this.state;
        this.state = newState;
        this.lastStateChange = Date.now();

        console.log(`Connection: ${oldState} → ${newState}`);

        // Notify listeners
        this.listeners.forEach(cb => cb({ oldState, newState }));

        // Handle state transitions
        if (newState === 'CONNECTED') {
            this.onConnected();
        } else if (newState === 'DISCONNECTED') {
            this.onDisconnected();
        }
    }

    onConnected() {
        // Flush queued messages
        this.flushQueue();
    }

    onDisconnected() {
        // Stop sending, queue instead
    }

    async sendMessage(message) {
        if (this.isConnected) {
            return this.app.sendMessage(message);
        } else {
            // Queue for later
            this.messageQueue.push(message);
            console.log(`Message queued (queue size: ${this.messageQueue.length})`);
            return false;
        }
    }

    flushQueue() {
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            console.log(`Flushing queued message: ${msg.type}`);
            this.app.sendMessage(msg);
        }
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }
}

// Usage:
class TerminalInputWithState {
    constructor() {
        // ... existing code ...
        this.stateManager = new ConnectionStateManager(window.app);
        window.app.stateManager = this.stateManager;

        // Listen for state changes
        this.stateManager.subscribe(({ oldState, newState }) => {
            this.updateConnectionUI(newState);
        });
    }

    async createNodes(userMessage, response) {
        const result = window.parser.parseInteraction(userMessage, response);

        // Use state manager instead of direct checks
        const sent = await this.stateManager.sendMessage({
            type: 'node_update',
            nodes: result.nodes,
            edges: result.edges
        });

        if (!sent) {
            // Fallback
            this.renderNodesLocally(result);
        }
    }

    updateConnectionUI(state) {
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = `status-${state.toLowerCase()}`;
            indicator.textContent = state;
        }
    }
}
```

---

## 4. MESSAGE ACKNOWLEDGMENT PATTERN

### Server-Side Implementation (server.js)

**Add ACK support to handleMessage()**:
```javascript
case MessageType.NODE_UPDATE:
    if (data.nodes) {
        const requestId = data.id || 'unknown';
        
        flowData.nodes.push(...data.nodes);
        
        // Broadcast to other clients
        const sentCount = broadcast({
            type: MessageType.NODE_UPDATE,
            nodes: data.nodes,
            edges: data.edges || [],
            timestamp: new Date().toISOString()
        }, client);

        // Send ACK back to originating client
        if (requestId !== 'unknown') {
            sendToClient(client, {
                type: 'ack',
                request_id: requestId,
                success: true,
                clients_notified: sentCount,
                timestamp: new Date().toISOString()
            });
        }
        
        saveFlowData();
    }
    break;
```

### Client-Side Implementation (app.js)

**Track pending messages**:
```javascript
class App {
    constructor() {
        // ... existing code ...
        this.pendingMessages = new Map();
    }

    handleMessage(data) {
        const message = JSON.parse(data);

        // Handle ACKs
        if (message.type === 'ack') {
            const pending = this.pendingMessages.get(message.request_id);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve(message);
                this.pendingMessages.delete(message.request_id);
            }
            return;
        }

        // ... rest of handleMessage
    }

    async sendMessageWithAck(message, timeout = 5000) {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        message.id = requestId;

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingMessages.delete(requestId);
                reject(new Error('ACK timeout'));
            }, timeout);

            this.pendingMessages.set(requestId, {
                resolve,
                reject,
                timeout: timeoutId
            });

            const sent = this.sendMessage(message);
            if (!sent) {
                this.pendingMessages.delete(requestId);
                clearTimeout(timeoutId);
                reject(new Error('Failed to send message'));
            }
        });
    }
}

// Usage in terminal-input.js:
async createNodes(userMessage, response) {
    const result = window.parser.parseInteraction(userMessage, response);

    try {
        // Wait for ACK
        const ack = await window.app.sendMessageWithAck({
            type: 'node_update',
            nodes: result.nodes,
            edges: result.edges
        });

        console.log(`Nodes confirmed on ${ack.clients_notified} clients`);
        this.showSuccess(`Nodes created and synchronized`);

    } catch (error) {
        console.log(`ACK failed (${error.message}), using fallback`);
        this.renderNodesLocally(result);
        this.showWarning(`Nodes created locally (${error.message})`);
    }
}
```

---

## 5. DEBOUNCED RENDERING PATTERN

### Add Render Debouncing to Canvas (canvas.js)

```javascript
class Canvas {
    constructor(svgElement) {
        // ... existing code ...
        this.renderDebounceTimer = null;
        this.pendingRenderData = null;
        this.RENDER_DEBOUNCE_MS = 100;
    }

    /**
     * Queue render with debounce (reduces jitter during multiple updates)
     */
    renderDebounced(data) {
        this.pendingRenderData = data;

        clearTimeout(this.renderDebounceTimer);

        this.renderDebounceTimer = setTimeout(() => {
            if (this.pendingRenderData) {
                this.render(this.pendingRenderData);
                this.pendingRenderData = null;
            }
        }, this.RENDER_DEBOUNCE_MS);
    }

    /**
     * Immediate render (for critical updates)
     */
    renderImmediate(data) {
        clearTimeout(this.renderDebounceTimer);
        this.render(data);
    }

    /**
     * Original render method (unchanged logic)
     */
    render(data) {
        // ... existing render code ...
    }
}

// Usage in app.js:
handleNodeUpdate(newNodes, newEdges) {
    const currentData = this.canvas.getData();
    const mergedData = {
        conversation_id: currentData.conversation_id,
        created_at: currentData.created_at,
        nodes: [...currentData.nodes, ...newNodes],
        edges: [...currentData.edges, ...newEdges]
    };

    // Use debounced render (smooth, avoids jitter)
    this.canvas.renderDebounced(mergedData);
}

// For terminal input (immediate, since user is watching):
renderNodesLocally(result) {
    const currentData = window.app.canvas.getData();
    const mergedData = {
        conversation_id: currentData.conversation_id || 'terminal-session',
        created_at: currentData.created_at || new Date().toISOString(),
        nodes: [...currentData.nodes, ...result.nodes],
        edges: [...currentData.edges, ...result.edges]
    };

    // Use immediate render (user is watching terminal)
    window.app.canvas.renderImmediate(mergedData);
}
```

---

## 6. TESTING REAL-TIME BEHAVIOR

### Manual Testing Checklist

```
CONNECTION TESTS:
[ ] Reload page while creating nodes (WebSocket drops)
[ ] Create nodes with network disabled (fallback)
[ ] Create nodes, then toggle network (recovery)
[ ] Multiple terminal windows creating simultaneously
[ ] Create nodes with intentional 5s latency

RACE CONDITION TESTS:
[ ] Spam Enter key rapidly (processMessage queue)
[ ] Zoom while nodes being created (debounce)
[ ] Create nodes while dragging (pan state)
[ ] Reconnect while creating nodes (message queuing)

DATA CONSISTENCY TESTS:
[ ] Create node, check all clients show it
[ ] Open multiple browser windows, create in one
[ ] Hard refresh mid-creation
[ ] Server restart during creation

ERROR HANDLING TESTS:
[ ] Parser fails (invalid input)
[ ] WebSocket message too large
[ ] Canvas rendering error
[ ] Database save fails (server-side)
```

### Automated Testing Example

```javascript
// Test: Fallback rendering works when WebSocket unavailable
async function testFallbackRendering() {
    // Close WebSocket
    window.app.ws.close();
    await new Promise(r => setTimeout(r, 100));

    // Try to create nodes
    const userMsg = "test";
    const assistantMsg = "test response";
    
    window.terminalInput.createNodes(userMsg, assistantMsg);
    
    await new Promise(r => setTimeout(r, 100));

    // Check nodes were rendered locally
    const data = window.app.canvas.getData();
    console.assert(data.nodes.length > 0, "No nodes rendered!");
    console.log("✓ Fallback rendering works");
}

// Test: Message ordering preserved
async function testMessageOrdering() {
    const messages = ['first', 'second', 'third'];
    
    for (const msg of messages) {
        window.terminalInput.sendMessage();
        window.terminalInput.input.value = msg;
    }

    await new Promise(r => setTimeout(r, 2000));

    // Verify order...
}
```

---

## 7. SUMMARY: Key Takeaways

### Must-Have Features
1. **Error handling**: Check sendMessage() return value
2. **Fallback path**: Direct canvas.render() if no WebSocket
3. **Connection state**: Track and communicate connection status
4. **Message deduplication**: Don't duplicate nodes on re-render
5. **User feedback**: Show success/error messages

### Nice-to-Have Features
1. Message acknowledgment (ACK) from server
2. Message queue for offline mode
3. Debounced rendering
4. Connection state machine
5. Message tracking/tracing
6. Automatic retry logic

### Critical Files to Monitor
- `/terminal-input.js`: createNodes() method (Line 201)
- `/app.js`: sendMessage() method (Line 249)
- `/app.js`: handleNodeUpdate() method (Line 213)
- `/canvas.js`: render() method (Line 130)

### Performance Tips
1. Debounce render calls when multiple updates incoming
2. Use canvas.getData() sparingly (local cache it)
3. Deduplicate nodes before merging
4. Clear timeouts on connection state changes
5. Batch DOM updates (canvas already does this)

