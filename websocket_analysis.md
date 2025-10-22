# WebSocket Integration & App.js Coordination Analysis
## Claude Flow Real-Time Communication Architecture

---

## 1. WEBSOCKET MESSAGE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MESSAGE FLOW ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   WebSocket      │
│   Server         │
│  (Node.js)       │
└─────────┬────────┘
          │
    [Listen Port 3000]
          │
          ├─────────────────────────────────────────┐
          │                                         │
          ▼                                         ▼
    ┌──────────────┐                      ┌──────────────┐
    │   Client 1   │                      │   Client N   │
    │  (Browser)   │                      │  (Browser)   │
    └──────────────┘                      └──────────────┘

CLIENT → SERVER MESSAGES:
  ├─ subscribe: Register as active client
  ├─ request_state: Get current canvas data
  ├─ node_update: Send new nodes to broadcast
  ├─ edge_update: Send new edges to broadcast
  ├─ ping: Keep-alive signal
  └─ clear: Clear all canvas data

SERVER → CLIENT MESSAGES (BROADCAST):
  ├─ state: Full canvas state dump
  ├─ node_update: New nodes [to all clients]
  ├─ edge_update: New edges [to all clients]
  ├─ error: Server-side error
  └─ ping: Server keep-alive (every 30s)
```

---

## 2. TERMINAL → CANVAS UPDATE SEQUENCE

```
REAL-TIME PATH (WebSocket Available):

  User Types → Terminal Input
       │
       ├─ Enter Key triggers sendMessage()
       ├─ Display in terminal UI
       ├─ Add to command history
       │
       ▼
  executeCommand() via HTTP
       │
       ├─ POST /api/execute
       ├─ Server executes shell command
       ├─ Returns output
       │
       ▼
  processMessage()
       │
       ├─ Display output in terminal
       ├─ Call createNodes()
       │
       ▼
  window.parser.parseInteraction()
       │
       ├─ User message → Input Node
       ├─ Output → Output Node + Meta Nodes
       ├─ Generate edges
       │
       ▼
  Check: window.app.ws.readyState === OPEN?
       │
  ┌────┴────┐
  │ YES    NO
  ▼         ▼
WebSocket  Fallback
  │         │
  ├─ sendMessage()  ├─ getData()
  │  {              ├─ Merge nodes
  │   type: 'node_  ├─ render()
  │   update',      │
  │   nodes: [...], └─ Direct DOM
  │   edges: [...]     update
  │  }              
  │
  ▼
[Server Receives]
  │
  ├─ Add to flowData
  ├─ Save to /data/flow.json
  ├─ Broadcast to ALL clients
  │
  ▼
[All Clients Receive]
  │
  ├─ handleMessage('node_update')
  ├─ Merge new nodes with existing
  ├─ renderFlowData()
  ├─ canvas.render()
  │
  ▼
[Canvas Updated on All Clients]
```

---

## 3. SERVER MESSAGE HANDLING (server.js)

### broadcast() Function (Lines 104-116)
```javascript
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
```
- Sends message to ALL connected clients
- Can exclude the originating client
- Returns count of clients notified
- Key point: NODE_UPDATE messages exclude sender

### handleMessage() Function (Lines 147-242)
Processes incoming WebSocket messages:

**REQUEST_STATE** (Lines 172-180):
- Client requests full current state
- Server responds with complete flowData

**NODE_UPDATE** (Lines 182-193):
- Client sends new nodes
- Server adds to flowData.nodes
- Broadcasts to ALL OTHER clients
- Saves to file

**EDGE_UPDATE** (Lines 195-206):
- Similar to node update
- Adds edges to flowData.edges

**PING/PONG** (Lines 224-230):
- Keep-alive mechanism
- Server sends ping every 30 seconds
- Client responds with pong

**CLEAR** (Lines 208-222):
- Resets flowData
- Broadcasts clear to all

---

## 4. CLIENT MESSAGE HANDLING (app.js)

### connectWebSocket() Function (Lines 71-148)
```javascript
connectWebSocket() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
        this.isConnecting = false;
        this.useFallback = false;
        this.updateStatus('Connected');
        this.sendMessage({ type: 'request_state' });
        // Clear reconnect timer
    };

    this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
        this.isConnecting = false;
        // Attempt reconnection after 2s
        this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket();
        }, this.reconnectInterval);
    };

    this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
    };
}
```

### handleMessage() Function (Lines 153-208)
Routes messages by type:

| Message Type | Action |
|--------------|--------|
| 'state' | Call renderFlowData(message.data) |
| 'node_update' | Call handleNodeUpdate(message.nodes) |
| 'edge_update' | Call handleEdgeUpdate(message.edges) |
| 'clear' | Call canvas.clear() |
| 'ping' | Respond with sendMessage({type:'pong'}) |
| 'error' | Log server error |

### handleNodeUpdate() Function (Lines 213-227)
```javascript
handleNodeUpdate(newNodes, newEdges) {
    const currentData = this.canvas.getData();
    const mergedData = {
        conversation_id: currentData.conversation_id,
        created_at: currentData.created_at,
        nodes: [...currentData.nodes, ...newNodes],
        edges: [...currentData.edges, ...newEdges]
    };
    this.renderFlowData(mergedData);
}
```
- Gets current canvas data
- Merges new nodes (simple append)
- Re-renders complete graph

### sendMessage() Function (Lines 249-255)
```javascript
sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
        return true;
    }
    return false;
}
```
- Checks connection is OPEN before sending
- Returns boolean (critical for error handling!)

---

## 5. TERMINAL INPUT INTEGRATION (terminal-input.js)

### sendMessage() Function (Lines 83-99)
```javascript
sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;

    this.commandHistory.push(message);
    this.historyIndex = this.commandHistory.length;

    this.addToTerminal('user', message);
    this.input.value = '';

    this.processMessage(message);
}
```
- Gets and validates input
- Stores in history for arrow-key navigation
- Displays immediately
- Processes asynchronously

### processMessage() Function (Lines 101-129)
```javascript
async processMessage(message) {
    this.addToTerminal('system', 'Processing...');

    try {
        if (message.startsWith('/')) {
            await this.handleSpecialCommand(message);
            return;
        }

        const response = await this.executeCommand(message);
        this.addToTerminal('assistant', response);

        if (response && response.length > 0) {
            this.createNodes(message, response);
        }
    } catch (error) {
        this.addToTerminal('system', `❌ Error: ${error.message}`);
    }
}
```
- Special commands: /help, /clear, /status
- Regular commands executed via HTTP
- On success: createNodes()

### createNodes() Function (Lines 201-235) - CRITICAL INTEGRATION
```javascript
createNodes(userMessage, assistantResponse) {
    // Step 1: Parse into nodes and edges
    if (!window.parser) {
        console.warn('Parser not available');
        return;
    }

    const result = window.parser.parseInteraction(userMessage, assistantResponse);

    // Step 2: Try WebSocket FIRST
    if (window.app && window.app.ws && window.app.ws.readyState === WebSocket.OPEN) {
        window.app.sendMessage({
            type: 'node_update',
            nodes: result.nodes,
            edges: result.edges
        });
    } 
    // Step 3: FALLBACK to direct canvas update
    else {
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

    // Step 4: Show success notification
    if (window.ui) {
        window.ui.success('Nodes Created', `${result.nodes.length} node(s) added to canvas`);
    }
}
```

**KEY FLOW**:
1. Parse terminal input/output into nodes
2. If WebSocket available: Send via sendMessage() to server
3. If no WebSocket: Render directly to canvas
4. Show success message

---

## 6. PARSER INTEGRATION (parser.js)

### parseInteraction() Function (Lines 32-48)
```javascript
parseInteraction(inputText, outputText) {
    const nodes = [];
    const edges = [];

    // Create input node
    const inputNode = this.createNode('input', inputText, null);
    nodes.push(inputNode);

    // Parse output for different node types
    const outputNodes = this.parseOutput(outputText, inputNode.id);

    // Add all nodes and edges
    nodes.push(...outputNodes.nodes);
    edges.push(...outputNodes.edges);

    return { nodes, edges };
}
```

Returns structure:
```javascript
{
    nodes: [
        { id, type, content, parent_id, timestamp },
        ...
    ],
    edges: [
        { from: node_id, to: node_id },
        ...
    ]
}
```

### createNode() Function (Lines 205-213)
```javascript
createNode(type, content, parentId) {
    return {
        id: this.generateId(),
        type: type,
        content: content,
        parent_id: parentId,
        timestamp: new Date().toISOString()
    };
}
```

Node types: 'input', 'output', 'skill', 'auto'

---

## 7. CANVAS INTEGRATION (canvas.js)

### render() Function (Lines 130-172)
```javascript
render(data) {
    if (!data || !data.nodes || data.nodes.length === 0) {
        this.emptyState.style.display = 'block';
        return;
    }

    this.emptyState.style.display = 'none';
    this.currentData = data;

    // Clear and recalculate layout
    this.nodesGroup.innerHTML = '';
    this.edgesGroup.innerHTML = '';

    const nodesWithPositions = this.calculateLayout(data.nodes);

    // Render edges first, then nodes
    if (data.edges) {
        data.edges.forEach(edge => {
            // Find nodes and render edge
        });
    }

    nodesWithPositions.forEach(node => {
        this.renderNode(node);
    });

    this.updateNodeCount(data.nodes.length);
}
```

### getData() Function (Lines 177-184)
```javascript
getData() {
    return this.currentData || {
        conversation_id: null,
        created_at: new Date().toISOString(),
        nodes: [],
        edges: []
    };
}
```
- Returns current flow data structure
- Used by app.js to merge updates
- Used by terminal-input.js for fallback

---

## 8. CRITICAL RACE CONDITIONS & TIMING ISSUES

### Race Condition 1: WebSocket State Check Race

**Problem** (terminal-input.js Line 211):
```javascript
if (window.app && window.app.ws && window.app.ws.readyState === WebSocket.OPEN) {
    window.app.sendMessage(...);  // Could fail!
}
```

**Timeline**:
```
T0: Check readyState === OPEN ✓
T1: User switches browser tab
T2: Browser suspends WebSocket
T3: sendMessage() fails silently (returns false)
T4: Nodes created locally but NOT sent to server
T5: No fallback triggered!
```

**Impact**: Other clients don't see the nodes. Data inconsistency.

**Solution**: Check return value
```javascript
const sent = window.app.sendMessage({...});
if (!sent) {
    // Fallback to direct canvas update
}
```

---

### Race Condition 2: Concurrent Node Merges

**Problem** (app.js Line 215):
```javascript
handleNodeUpdate(newNodes) {
    const currentData = this.canvas.getData();  // T1
    const mergedData = {
        nodes: [...currentData.nodes, ...newNodes]  // T3
    };
}
```

**Timeline**:
```
Client A.T1: Gets 10 nodes
Server.T2: Broadcasts 11 nodes to all clients
Client B.T3: Receives update, renders 11 nodes
Client A.T4: Merges 10 + 1 = 11 (OK)
But if another client sends meanwhile:
Client A.T2a: Gets 10 nodes
Server.T2b: Broadcasts 11 nodes (all clients)
Client A.T3a: Still thinks it has 10
Client A.T4a: Merges 10 + 2 = 12 (DUPLICATE!)
```

**Impact**: Duplicate nodes appear on some clients.

**Solution**: Request state from server as source of truth
```javascript
handleNodeUpdate(newNodes) {
    // Don't merge locally - request full state
    this.sendMessage({ type: 'request_state' });
}
```

---

### Race Condition 3: Async Processing Order

**Problem** (terminal-input.js Line 101-118):
```javascript
async processMessage(message) {
    const response = await this.executeCommand(message);  // Async!
    this.createNodes(message, response);
}
```

**Timeline**:
```
User: "Command A" (slow, 3s)
User: "Command B" (fast, 0.5s)
T0.5: B finishes, createNodes(B)
T3.0: A finishes, createNodes(A)
Result: Nodes appear out of order!
```

**Impact**: Visual confusion, wrong node ordering.

**Solution**: Use message queue
```javascript
messageQueue = [];
isProcessing = false;

async processMessage(message) {
    this.messageQueue.push(message);
    if (!this.isProcessing) {
        this.processQueue();
    }
}

async processQueue() {
    while (this.messageQueue.length > 0) {
        this.isProcessing = true;
        const msg = this.messageQueue.shift();
        const response = await this.executeCommand(msg);
        this.createNodes(msg, response);
    }
    this.isProcessing = false;
}
```

---

### Race Condition 4: Canvas Render During Zoom/Pan

**Problem** (canvas.js):
```javascript
render(data) {
    this.nodesGroup.innerHTML = '';  // Clear DOM!
    this.renderNode(...);  // Add new nodes
}

setupZoomPan() {
    svg.addEventListener('wheel', (e) => {
        this.zoom *= delta;
        this.updateTransform();  // Changes SVG transform
    });
}
```

**Timeline**:
```
T0: User scrolls wheel
T1: updateTransform() called
T2: SVG zoom level changes
T3: render() called (from WebSocket update)
T4: nodesGroup.innerHTML = '' (clear nodes)
T5: SVG not redrawn yet at new zoom
T6: renderNode() adds nodes at old position
Result: Visual glitches, flicker
```

**Impact**: Jumpy, flickering rendering during interaction.

**Solution**: Debounce render calls
```javascript
renderDebounced = debounce(() => {
    this.render(this.pendingData);
}, 100);

handleNodeUpdate(nodes) {
    this.pendingData = nodes;
    this.renderDebounced();
}

function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
```

---

### Race Condition 5: Fallback Mode Inconsistency

**Problem** (app.js Lines 48-63):
```javascript
this.connectWebSocket();

// Fallback after 5s
setTimeout(() => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.useFallback = true;
        this.startPolling();
    }
}, 5000);

// But if WS reconnects later...
this.ws.onopen = () => {
    this.useFallback = false;
}
```

**Timeline**:
```
T0: WS disconnects
T5: Fallback enabled, polling starts
T10: File polling reads state (10 nodes)
T15: User adds node in terminal (local render to 11)
T20: WS reconnects unexpectedly
T21: onopen sends request_state
T22: Server responds with 10 nodes (local change lost!)
T23: render() shows 10 nodes (user sees node disappear!)
```

**Impact**: Local changes lost when WebSocket reconnects.

**Solution**: Queue local changes
```javascript
localChanges = [];

createNodes(nodes, edges) {
    // Always queue locally
    this.localChanges.push({ nodes, edges, timestamp: Date.now() });
    
    if (this.isWebSocketAvailable()) {
        this.sendViaWebSocket(...);
    } else {
        this.sendViaFallback(...);
    }
}

onWebSocketReconnect() {
    // Request state
    this.sendMessage({ type: 'request_state' });
    
    // After state received, merge local changes
    this.mergeLocalChanges();
}
```

---

## 9. DATA STRUCTURE REFERENCE

### Flow Data Structure
```javascript
{
    conversation_id: "conv-abc123",
    created_at: "2024-01-01T12:00:00Z",
    nodes: [
        {
            id: "node-1",
            type: "input|output|skill|auto",
            content: "text content",
            parent_id: "node-0" | null,
            title: "optional for skills",
            skill_name: "metacognitive-flow",
            timestamp: "2024-01-01T12:00:01Z"
        }
    ],
    edges: [
        {
            from: "node-1",
            to: "node-2"
        }
    ]
}
```

### WebSocket Message Types
```javascript
// Client → Server
{
    type: "subscribe|unsubscribe|request_state|node_update|edge_update|clear|ping|pong"
    id?: "message-id",  // Optional, for ACK
    nodes?: [...],      // For node_update
    edges?: [...],      // For edge_update
    timestamp?: "..."
}

// Server → Clients
{
    type: "state|node_update|edge_update|clear|error|ping|pong",
    data?: {...},       // For state
    nodes?: [...],      // For node_update
    edges?: [...],      // For edge_update
    error?: "message",  // For error
    timestamp: "ISO",
    clients_notified?: 5  // For broadcast tracking
}
```

---

## 10. GLOBAL WINDOW OBJECTS

```javascript
window.app          // App instance - main orchestrator
window.app.ws       // WebSocket connection
window.app.canvas   // Canvas instance
window.app.parser   // Parser instance

window.canvas       // Canvas instance (for v2)
window.parser       // Parser instance
window.terminalInput // TerminalInput instance
window.ui           // UI utilities (notifications)
```

---

## 11. API ENDPOINTS FOR REFERENCE

### Server HTTP APIs (server.js)

```
POST /api/nodes
  Body: { nodes: [...], edges: [...] }
  Returns: { success: true, nodes_added: N, clients_notified: N }
  Purpose: Add nodes via HTTP (alternative to WebSocket)

POST /api/execute
  Body: { command: string, type: 'shell'|'claude' }
  Returns: { success: bool, output: string, error?: string }
  Purpose: Execute shell commands from terminal

POST /api/clear
  Returns: { success: true }
  Purpose: Clear all flow data

GET /api/state
  Returns: { flow_data: {...}, clients_connected: N, timestamp: "..." }
  Purpose: Get current state

GET /api/health
  Returns: { status: 'ok', uptime: N, clients: N, nodes: N, edges: N }
  Purpose: Health check
```

---

## 12. IMPLEMENTATION CHECKLIST FOR ROBUST REAL-TIME

- [ ] Add request ID to all messages (for tracking)
- [ ] Implement ACK mechanism (server confirms receipt)
- [ ] Add message queue for offline mode
- [ ] Implement exponential backoff (reconnection)
- [ ] Add deduplication logic (prevent duplicate nodes)
- [ ] Check sendMessage() return value (never ignore!)
- [ ] Implement timeout handling (5s for ACK)
- [ ] Add fallback trigger (if sendMessage fails)
- [ ] Queue local changes (during disconnection)
- [ ] Merge on reconnect (apply queued changes)
- [ ] Request state periodically (sync verification)
- [ ] Debounce render calls (smooth rendering)
- [ ] Add connection state indicator (UI feedback)
- [ ] Log all WebSocket events (debugging)
- [ ] Test with intentional disconnections
- [ ] Test concurrent client updates
- [ ] Test network lag simulation
- [ ] Add error notifications to user

---

## 13. QUICK REFERENCE: KEY FILES & LINES

| What | File | Lines |
|------|------|-------|
| Server broadcast | server.js | 104-116 |
| Handle WebSocket msg | server.js | 147-242 |
| Client connect | app.js | 71-148 |
| Client message handler | app.js | 153-208 |
| Node update merge | app.js | 213-227 |
| Send message | app.js | 249-255 |
| Terminal send | terminal-input.js | 83-99 |
| Process message | terminal-input.js | 101-129 |
| Create nodes (CRITICAL) | terminal-input.js | 201-235 |
| Canvas render | canvas.js | 130-172 |
| Parse interaction | parser.js | 32-48 |
| Create node | parser.js | 205-213 |

