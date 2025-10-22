# Terminal Input/Output Flow Visualization - Implementation Plan

**BMAD V6 Method - Epic Planning**

**Date:** 2025-10-22
**Status:** Planning Phase
**Priority:** Critical (Foundation for future canvas features)

---

## 1. EXECUTIVE SUMMARY

### Objective
Implement real-time terminal input/output visualization in the node canvas where:
- Every command typed creates an **input node**
- Command execution creates an **output node** (success or error)
- Nodes are **interconnected sequentially** (input → output → next input → next output)
- **Error messages create error nodes** with red styling
- All updates happen in **real-time** via WebSocket
- Node context matches terminal context exactly

### Success Criteria
- ✅ Every terminal command creates visible nodes
- ✅ Nodes appear in real-time as commands execute
- ✅ Input/output pairs are connected with edges
- ✅ Errors create distinct error nodes (red color)
- ✅ Sequential command flow visible top-to-bottom
- ✅ Terminal context preserved in node metadata
- ✅ No race conditions or duplicate nodes
- ✅ Canvas auto-scrolls to latest node

### Estimated Effort
- **Planning:** 2 hours (DONE)
- **Implementation:** 6-8 hours
- **Testing:** 2 hours
- **Documentation:** 1 hour
- **Total:** 11-13 hours

---

## 2. CURRENT SYSTEM ANALYSIS

### 2.1 Canvas Rendering (canvas.js)

**Architecture:**
- SVG-based with 3 groups: canvas-group, nodes-group, edges-group
- Hierarchical layout algorithm (top-to-bottom, O(n) complexity)
- Full re-render on each update (not incremental)
- Node dimensions: 180×100px rectangles
- Vertical spacing: 150px between levels
- Horizontal spacing: 220px between siblings

**Node Types & Colors:**
```javascript
input:      Green gradient (#10b981 → #059669)
output:     Blue gradient (#3b82f6 → #2563eb)
skill:      Orange gradient (#f59e0b → #d97706)
section:    Purple gradient (#8b5cf6 → #7c3aed)
structured: Pink gradient (#ec4899 → #db2777)
```

**Key Methods:**
- `render(flowData)` - Main rendering entry point
- `layoutNodes(nodes)` - Calculate node positions
- `renderNode(node)` - Create SVG elements for single node
- `renderEdge(edge, nodes)` - Draw Bézier curves between nodes
- `getData()` - Return current flow data

**Identified Issues:**
- ❌ No "error" node type
- ❌ No "terminal_command" or "terminal_output" types
- ❌ No execution status tracking
- ❌ Layout algorithm doesn't handle sequential chains well

### 2.2 Parser System (parser-v2.js)

**Current Flow:**
```
parseInteraction(userInput, assistantOutput)
  → Extract sections, skills, structured content
  → Create input node (id: node-{counter})
  → Create output node (id: node-{counter+1})
  → Create skill/section nodes (id: node-{counter+2...})
  → Create edges (input → all other nodes)
  → Return { nodes: [...], edges: [...] }
```

**Node Data Structure:**
```javascript
{
  id: "node-123",
  type: "input" | "output" | "skill" | "section" | "structured",
  content: "text content",
  parent_id: "node-122" | null,
  level: 0,
  position: { x: 400, y: 0 },
  metadata: {
    timestamp: "2025-10-22T...",
    skill_type: "thought" | "emotion" | ...
  }
}
```

**Identified Issues:**
- ❌ No error node creation logic
- ❌ No terminal context preservation
- ❌ Sequential edges not created (only input → outputs)
- ❌ ID counter not thread-safe
- ❌ No execution status in metadata

### 2.3 WebSocket Integration (app.js + terminal-input.js)

**Current Message Flow:**
```
Terminal Input
  ↓
processMessage() [terminal-input.js:101]
  ↓
executeCommand() [terminal-input.js:166]
  ↓
createNodes(userMessage, assistantResponse) [terminal-input.js:201]
  ↓
parser.parseInteraction()
  ↓
sendMessage({ type: 'node_update', nodes, edges }) [terminal-input.js:212]
  ↓
WebSocket → Server → Broadcast to All Clients
  ↓
app.handleMessage() [app.js:71-208]
  ↓
canvas.render()
```

**Identified Issues:**
- ❌ sendMessage() return value ignored (silent failures)
- ❌ No error handling in createNodes()
- ❌ No fallback when WebSocket fails
- ❌ Race condition: multiple commands processed out of order
- ❌ No message deduplication
- ❌ Terminal context not passed to parser

### 2.4 Terminal Input (terminal-input.js)

**Current Execution Flow:**
```javascript
async processMessage(message) {
  // 1. Show "Processing..." indicator
  addToTerminal('system', 'Processing...');

  // 2. Execute command via /api/execute
  const response = await executeCommand(message);

  // 3. Display response in terminal
  addToTerminal('assistant', response);

  // 4. Create nodes (BUT no error handling!)
  createNodes(message, response);
}
```

**Identified Issues:**
- ❌ No distinction between success/error responses
- ❌ Errors are shown in terminal but not in canvas
- ❌ No execution metadata captured (timestamp, exit code, duration)
- ❌ No sequential linking of commands

---

## 3. REQUIREMENTS SPECIFICATION

### 3.1 Functional Requirements

**FR-1: Input Node Creation**
- **Trigger:** User types command and presses Enter
- **Action:** Create input node immediately (before execution)
- **Node Type:** `terminal_input`
- **Content:** The exact command text
- **Metadata:**
  ```javascript
  {
    timestamp: ISO8601,
    terminal_session: "session-id",
    command_index: 0, 1, 2, ...
    status: "pending" | "executing" | "complete" | "error"
  }
  ```
- **Visual:** Green border, monospace font, left-aligned
- **Position:** Top-to-bottom sequential

**FR-2: Output Node Creation**
- **Trigger:** Command execution completes (success or error)
- **Action:** Create output node connected to input node
- **Node Type:** `terminal_output` (success) or `terminal_error` (error)
- **Content:** Command output or error message (truncated to 5 lines)
- **Metadata:**
  ```javascript
  {
    timestamp: ISO8601,
    terminal_session: "session-id",
    parent_command: "node-123",
    exit_code: 0 | non-zero,
    duration_ms: 1234,
    output_length: 5678
  }
  ```
- **Visual:**
  - Success: Blue/cyan color, monospace font
  - Error: Red color, bold text, error icon
- **Position:** Directly below input node, connected by edge

**FR-3: Sequential Flow Connection**
- **Trigger:** Multiple commands executed in sequence
- **Action:** Connect nodes in execution order
- **Edge Structure:**
  - Input₁ → Output₁
  - Output₁ → Input₂ (sequential link)
  - Input₂ → Output₂
  - Output₂ → Input₃ (sequential link)
- **Visual:** Solid line for command→output, dotted line for sequential flow

**FR-4: Error Node Handling**
- **Trigger:** Command execution fails (exit code ≠ 0)
- **Action:** Create error node instead of output node
- **Node Type:** `terminal_error`
- **Content:** Error message with exit code
- **Visual:** Red background, white text, error icon
- **Behavior:** Still creates sequential link to next input

**FR-5: Real-Time Updates**
- **Trigger:** Node creation in terminal
- **Action:** Immediate WebSocket broadcast
- **Latency:** < 100ms from command execution to canvas update
- **Fallback:** Direct canvas.render() if WebSocket unavailable
- **Visual Feedback:** Node appears with fade-in animation

**FR-6: Terminal Context Preservation**
- **Metadata Stored:**
  - Terminal session ID
  - Command index (0, 1, 2, ...)
  - Execution timestamp
  - Parent/child relationships
  - Working directory
  - Environment variables (optional)
- **Persistence:** Stored in server flowData
- **Restoration:** Can rebuild terminal history from nodes

**FR-7: Canvas Auto-Scroll**
- **Trigger:** New node added below viewport
- **Action:** Smooth scroll to show latest node
- **Animation:** 300ms ease-out
- **Behavior:** Only scrolls if user is near bottom (within 200px)

### 3.2 Non-Functional Requirements

**NFR-1: Performance**
- Node creation: < 50ms
- Canvas render: < 100ms for 100 nodes
- WebSocket latency: < 50ms
- No UI blocking during command execution

**NFR-2: Reliability**
- Zero data loss (fallback to direct render)
- No duplicate nodes (message deduplication)
- No race conditions (message queue)
- Graceful error handling

**NFR-3: Scalability**
- Support 1000+ terminal commands
- Efficient rendering (virtual canvas for large graphs)
- Pagination for long command outputs

**NFR-4: Usability**
- Clear visual distinction between input/output/error
- Easy to trace command flow
- Hover tooltips show full output
- Click to expand truncated content

---

## 4. ARCHITECTURE DESIGN

### 4.1 Node Type System

**New Node Types:**
```javascript
// In parser-config.json and parser-v2.js

TERMINAL_INPUT: {
  type: "terminal_input",
  color: "#22c55e",      // Green
  icon: "terminal",
  gradient: ["#22c55e", "#16a34a"],
  maxHeight: 80,
  fontSize: 14,
  fontFamily: "'Fira Code', 'Consolas', monospace"
}

TERMINAL_OUTPUT: {
  type: "terminal_output",
  color: "#06b6d4",      // Cyan
  icon: "check-circle",
  gradient: ["#06b6d4", "#0891b2"],
  maxHeight: 120,
  fontSize: 12,
  fontFamily: "'Fira Code', 'Consolas', monospace"
}

TERMINAL_ERROR: {
  type: "terminal_error",
  color: "#ef4444",      // Red
  icon: "x-circle",
  gradient: ["#ef4444", "#dc2626"],
  maxHeight: 120,
  fontSize: 12,
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontWeight: "bold"
}
```

### 4.2 Enhanced Node Data Structure

```javascript
{
  // Standard fields
  id: "node-cmd-12345",        // Unique ID with prefix
  type: "terminal_input|terminal_output|terminal_error",
  content: "pwd\n/home/user",  // Command or output
  parent_id: "node-cmd-12344", // Previous node in sequence
  level: 5,                    // Depth in tree
  position: { x: 400, y: 750 },

  // Enhanced terminal metadata
  metadata: {
    // Execution context
    timestamp: "2025-10-22T06:30:15.123Z",
    terminal_session: "session-abc123",
    command_index: 5,

    // For input nodes
    command: "pwd",
    working_directory: "/home/user",

    // For output nodes
    parent_command: "node-cmd-12345",
    exit_code: 0,
    duration_ms: 45,
    output_length: 12,
    truncated: false,

    // Status tracking
    status: "complete" | "error" | "pending" | "executing",

    // For error nodes
    error_message: "Command not found: foo",
    stderr: "bash: foo: command not found"
  }
}
```

### 4.3 Enhanced Edge Structure

```javascript
{
  id: "edge-123",
  source: "node-cmd-12345",   // Input node
  target: "node-cmd-12346",   // Output node
  type: "command_output",     // Edge type
  style: "solid",             // solid | dashed | dotted
  color: "#6366f1",
  animated: false,

  metadata: {
    relationship: "command_to_output" | "sequential_flow",
    timestamp: "2025-10-22T06:30:15.123Z"
  }
}
```

### 4.4 Sequential Layout Algorithm

**Algorithm: Top-to-Bottom Sequential Chain**

```javascript
function layoutTerminalFlow(nodes) {
  const terminalNodes = nodes.filter(n =>
    n.type.startsWith('terminal_')
  );

  // Sort by command_index
  terminalNodes.sort((a, b) =>
    a.metadata.command_index - b.metadata.command_index
  );

  let currentY = 100;  // Start position
  const X_CENTER = 400;
  const Y_SPACING = 180; // Space between node pairs

  for (let i = 0; i < terminalNodes.length; i += 2) {
    const inputNode = terminalNodes[i];
    const outputNode = terminalNodes[i + 1];

    // Position input node
    inputNode.position = {
      x: X_CENTER,
      y: currentY
    };

    // Position output node directly below
    if (outputNode) {
      outputNode.position = {
        x: X_CENTER,
        y: currentY + 100  // 100px below input
      };

      currentY += Y_SPACING; // Move to next pair
    }
  }

  return terminalNodes;
}
```

### 4.5 Message Flow Architecture

**Updated Flow with Error Handling:**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                               │
│    Terminal: pwd <Enter>                                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CREATE INPUT NODE (Immediately)                          │
│    - Type: terminal_input                                   │
│    - Status: "pending"                                      │
│    - Send to canvas via WebSocket                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EXECUTE COMMAND                                          │
│    POST /api/execute { command: "pwd" }                     │
│    - Update input node status: "executing"                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RECEIVE RESPONSE                                         │
│    { success: true, output: "/home/user", exit_code: 0 }   │
│    OR { success: false, output: "Error", exit_code: 1 }    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              ┌──────┴──────┐
              ↓             ↓
    ┌─────────────┐   ┌─────────────┐
    │  SUCCESS    │   │   ERROR     │
    └─────┬───────┘   └──────┬──────┘
          ↓                  ↓
┌─────────────────┐   ┌─────────────────┐
│ CREATE OUTPUT   │   │ CREATE ERROR    │
│ NODE (cyan)     │   │ NODE (red)      │
│ exit_code: 0    │   │ exit_code: 1    │
└────────┬────────┘   └────────┬────────┘
         └──────────┬───────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. UPDATE INPUT NODE                                        │
│    - Status: "complete" or "error"                          │
│    - Link to output/error node                              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. SEND TO CANVAS                                           │
│    WebSocket: { type: 'node_update', nodes, edges }        │
│    - Input node (updated)                                   │
│    - Output/Error node (new)                                │
│    - Edge connecting them                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. CANVAS RENDERS                                           │
│    - Update SVG                                             │
│    - Auto-scroll to new node                                │
│    - Fade-in animation                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. IMPLEMENTATION PLAN

### 5.1 Phase 1: Parser Enhancement (2-3 hours)

**Files to Modify:**
- `parser-v2.js`
- `parser-config.json`

**Tasks:**

**Task 1.1: Add Terminal Node Types**
```javascript
// In parser-config.json
{
  "nodeTypes": {
    "terminal_input": {
      "color": "#22c55e",
      "gradient": ["#22c55e", "#16a34a"],
      "icon": "terminal",
      "maxLines": 3
    },
    "terminal_output": {
      "color": "#06b6d4",
      "gradient": ["#06b6d4", "#0891b2"],
      "icon": "check-circle",
      "maxLines": 5
    },
    "terminal_error": {
      "color": "#ef4444",
      "gradient": ["#ef4444", "#dc2626"],
      "icon": "x-circle",
      "maxLines": 5
    }
  }
}
```

**Task 1.2: Create parseTerminalExecution() Method**
```javascript
// In parser-v2.js

parseTerminalExecution(command, result, metadata) {
  const nodes = [];
  const edges = [];
  const timestamp = new Date().toISOString();

  // 1. Create input node
  const inputId = `node-cmd-${Date.now()}-${this.nodeCounter++}`;
  const inputNode = {
    id: inputId,
    type: 'terminal_input',
    content: command,
    parent_id: metadata.previous_output_id || null,
    level: metadata.command_index,
    position: { x: 400, y: 0 }, // Will be laid out later
    metadata: {
      timestamp,
      terminal_session: metadata.session_id,
      command_index: metadata.command_index,
      status: result.success ? 'complete' : 'error',
      working_directory: metadata.cwd || process.cwd()
    }
  };
  nodes.push(inputNode);

  // 2. Create output or error node
  const outputId = `node-out-${Date.now()}-${this.nodeCounter++}`;
  const outputNode = {
    id: outputId,
    type: result.success ? 'terminal_output' : 'terminal_error',
    content: this.truncateOutput(result.output, 5),
    parent_id: inputId,
    level: metadata.command_index,
    position: { x: 400, y: 0 },
    metadata: {
      timestamp,
      terminal_session: metadata.session_id,
      parent_command: inputId,
      exit_code: result.exit_code || 0,
      duration_ms: result.duration_ms || 0,
      output_length: result.output.length,
      truncated: result.output.split('\n').length > 5,
      error_message: result.success ? null : result.output
    }
  };
  nodes.push(outputNode);

  // 3. Create edge from input to output
  edges.push({
    id: `edge-${inputId}-${outputId}`,
    source: inputId,
    target: outputId,
    type: 'command_output',
    style: 'solid',
    color: result.success ? '#06b6d4' : '#ef4444',
    metadata: {
      relationship: 'command_to_output',
      timestamp
    }
  });

  // 4. Create sequential edge if there's a previous output
  if (metadata.previous_output_id) {
    edges.push({
      id: `edge-seq-${metadata.previous_output_id}-${inputId}`,
      source: metadata.previous_output_id,
      target: inputId,
      type: 'sequential_flow',
      style: 'dashed',
      color: '#6366f1',
      metadata: {
        relationship: 'sequential_flow',
        timestamp
      }
    });
  }

  return {
    nodes,
    edges,
    lastOutputId: outputId // For next sequential link
  };
}

truncateOutput(output, maxLines) {
  const lines = output.split('\n');
  if (lines.length <= maxLines) {
    return output;
  }
  return lines.slice(0, maxLines).join('\n') +
         `\n... (${lines.length - maxLines} more lines)`;
}
```

**Task 1.3: Add Tests**
```javascript
// In test-parser.js
describe('Terminal Execution Parsing', () => {
  test('should create input and output nodes', () => {
    const result = parser.parseTerminalExecution(
      'pwd',
      { success: true, output: '/home/user', exit_code: 0 },
      { session_id: 'test', command_index: 0 }
    );

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].type).toBe('terminal_input');
    expect(result.nodes[1].type).toBe('terminal_output');
    expect(result.edges).toHaveLength(1);
  });

  test('should create error node for failed command', () => {
    const result = parser.parseTerminalExecution(
      'invalid',
      { success: false, output: 'Command not found', exit_code: 127 },
      { session_id: 'test', command_index: 1 }
    );

    expect(result.nodes[1].type).toBe('terminal_error');
    expect(result.edges[0].color).toBe('#ef4444');
  });

  test('should create sequential edges', () => {
    const result = parser.parseTerminalExecution(
      'ls',
      { success: true, output: 'file.txt', exit_code: 0 },
      {
        session_id: 'test',
        command_index: 2,
        previous_output_id: 'node-out-123'
      }
    );

    expect(result.edges).toHaveLength(2);
    expect(result.edges[1].type).toBe('sequential_flow');
  });
});
```

---

### 5.2 Phase 2: Terminal Input Enhancement (2 hours)

**Files to Modify:**
- `terminal-input.js`

**Task 2.1: Add Terminal Session Management**
```javascript
class TerminalInput {
  constructor() {
    // ... existing code ...

    // NEW: Terminal session tracking
    this.sessionId = `session-${Date.now()}`;
    this.commandIndex = 0;
    this.lastOutputId = null;
    this.commandQueue = [];  // For sequential processing
    this.isProcessing = false;
  }
}
```

**Task 2.2: Update processMessage() with Status Tracking**
```javascript
async processMessage(message) {
  // Add to queue for sequential processing
  this.commandQueue.push(message);

  // Process queue if not already processing
  if (!this.isProcessing) {
    await this.processQueue();
  }
}

async processQueue() {
  this.isProcessing = true;

  while (this.commandQueue.length > 0) {
    const message = this.commandQueue.shift();
    await this.executeAndVisualize(message);
  }

  this.isProcessing = false;
}

async executeAndVisualize(message) {
  const startTime = Date.now();

  try {
    // 1. Create pending input node
    const inputNodeId = await this.createPendingInputNode(message);

    // 2. Show processing in terminal
    this.addToTerminal('system', 'Processing...');

    // 3. Handle special commands
    if (message.startsWith('/')) {
      await this.handleSpecialCommand(message);
      this.removePendingNode(inputNodeId);
      return;
    }

    // 4. Execute command
    const result = await this.executeCommand(message);
    const duration = Date.now() - startTime;

    // 5. Display in terminal
    this.addToTerminal('assistant', result);

    // 6. Create nodes with full context
    await this.createTerminalNodes(message, result, {
      inputNodeId,
      duration,
      startTime
    });

  } catch (error) {
    console.error('Terminal error:', error);

    // Create error node even for execution failures
    await this.createTerminalErrorNode(message, error, {
      duration: Date.now() - startTime
    });

    this.addToTerminal('system', `❌ Error: ${error.message}`);
  }
}
```

**Task 2.3: Create Pending Input Node**
```javascript
async createPendingInputNode(command) {
  const nodeId = `node-cmd-${Date.now()}-${this.commandIndex}`;

  const node = {
    id: nodeId,
    type: 'terminal_input',
    content: command,
    parent_id: this.lastOutputId,
    level: this.commandIndex,
    position: { x: 400, y: 0 },
    metadata: {
      timestamp: new Date().toISOString(),
      terminal_session: this.sessionId,
      command_index: this.commandIndex,
      status: 'pending',
      working_directory: '/current/path'
    }
  };

  // Send immediately to canvas
  if (window.app?.ws?.readyState === WebSocket.OPEN) {
    const success = window.app.sendMessage({
      type: 'node_update',
      nodes: [node],
      edges: this.lastOutputId ? [{
        id: `edge-seq-${this.lastOutputId}-${nodeId}`,
        source: this.lastOutputId,
        target: nodeId,
        type: 'sequential_flow',
        style: 'dashed',
        color: '#6366f1'
      }] : []
    });

    if (!success) {
      // Fallback to direct render
      this.directRenderNodes([node], []);
    }
  } else {
    this.directRenderNodes([node], []);
  }

  return nodeId;
}
```

**Task 2.4: Create Terminal Nodes with Full Context**
```javascript
async createTerminalNodes(command, result, context) {
  if (!window.parser?.parseTerminalExecution) {
    console.warn('Parser terminal support not available');
    return;
  }

  // Parse execution result
  const parseResult = window.parser.parseTerminalExecution(
    command,
    {
      success: !result.includes('Error:') && !result.includes('failed:'),
      output: result,
      exit_code: result.includes('Error:') ? 1 : 0,
      duration_ms: context.duration
    },
    {
      session_id: this.sessionId,
      command_index: this.commandIndex,
      previous_output_id: this.lastOutputId,
      cwd: context.cwd || '/current/path'
    }
  );

  // Update pending input node to complete
  const updatedInputNode = parseResult.nodes[0];
  updatedInputNode.id = context.inputNodeId; // Use existing ID
  updatedInputNode.metadata.status = parseResult.nodes[1].type === 'terminal_error'
    ? 'error'
    : 'complete';

  // Store last output ID for next sequential link
  this.lastOutputId = parseResult.lastOutputId;
  this.commandIndex++;

  // Send to canvas
  if (window.app?.ws?.readyState === WebSocket.OPEN) {
    const success = window.app.sendMessage({
      type: 'node_update',
      nodes: parseResult.nodes,
      edges: parseResult.edges
    });

    if (!success) {
      this.directRenderNodes(parseResult.nodes, parseResult.edges);
    }
  } else {
    this.directRenderNodes(parseResult.nodes, parseResult.edges);
  }

  // Show success notification
  if (window.ui) {
    const nodeType = parseResult.nodes[1].type === 'terminal_error' ? 'error' : 'success';
    window.ui[nodeType === 'error' ? 'error' : 'success'](
      'Nodes Created',
      `Command ${nodeType === 'error' ? 'failed' : 'executed'} - ${parseResult.nodes.length} nodes added`
    );
  }
}
```

**Task 2.5: Add Direct Render Fallback**
```javascript
directRenderNodes(nodes, edges) {
  if (!window.app?.canvas) {
    console.error('Canvas not available');
    return;
  }

  const currentData = window.app.canvas.getData();
  const mergedData = {
    conversation_id: currentData.conversation_id || this.sessionId,
    created_at: currentData.created_at || new Date().toISOString(),
    nodes: [...currentData.nodes, ...nodes],
    edges: [...currentData.edges, ...edges]
  };

  window.app.canvas.render(mergedData);

  // Auto-scroll to latest node
  this.scrollToLatestNode();
}

scrollToLatestNode() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // Smooth scroll to bottom
  const lastNode = document.querySelector('[data-node-type^="terminal_"]:last-child');
  if (lastNode) {
    lastNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
```

---

### 5.3 Phase 3: Canvas Enhancement (2-3 hours)

**Files to Modify:**
- `canvas.js`
- `style-v2.css`

**Task 3.1: Add Terminal Node Rendering**
```javascript
// In canvas.js, update renderNode() method

renderNode(node) {
  // ... existing code ...

  // Add terminal node types
  if (node.type === 'terminal_input') {
    return this.renderTerminalInputNode(node);
  } else if (node.type === 'terminal_output') {
    return this.renderTerminalOutputNode(node);
  } else if (node.type === 'terminal_error') {
    return this.renderTerminalErrorNode(node);
  }

  // ... existing rendering code ...
}

renderTerminalInputNode(node) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'node terminal-input');
  g.setAttribute('data-node-id', node.id);
  g.setAttribute('data-node-type', 'terminal_input');
  g.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);

  // Background rectangle with green gradient
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '200');
  rect.setAttribute('height', '80');
  rect.setAttribute('rx', '8');
  rect.setAttribute('ry', '8');
  rect.setAttribute('fill', 'url(#terminalInputGradient)');
  rect.setAttribute('stroke', '#22c55e');
  rect.setAttribute('stroke-width', '2');
  g.appendChild(rect);

  // Status indicator (pending/executing/complete)
  const statusColor = {
    'pending': '#fbbf24',
    'executing': '#3b82f6',
    'complete': '#22c55e',
    'error': '#ef4444'
  }[node.metadata.status || 'complete'];

  const statusCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  statusCircle.setAttribute('cx', '15');
  statusCircle.setAttribute('cy', '15');
  statusCircle.setAttribute('r', '5');
  statusCircle.setAttribute('fill', statusColor);
  g.appendChild(statusCircle);

  // Command text (monospace)
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '30');
  text.setAttribute('y', '20');
  text.setAttribute('fill', '#ffffff');
  text.setAttribute('font-family', "'Fira Code', 'Consolas', monospace");
  text.setAttribute('font-size', '13');
  text.setAttribute('font-weight', 'bold');
  text.textContent = `$ ${node.content.slice(0, 40)}`;
  g.appendChild(text);

  // Timestamp
  const timestamp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  timestamp.setAttribute('x', '10');
  timestamp.setAttribute('y', '65');
  timestamp.setAttribute('fill', '#9ca3af');
  timestamp.setAttribute('font-size', '10');
  timestamp.textContent = new Date(node.metadata.timestamp).toLocaleTimeString();
  g.appendChild(timestamp);

  // Command index
  const index = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  index.setAttribute('x', '170');
  index.setAttribute('y', '65');
  index.setAttribute('fill', '#9ca3af');
  index.setAttribute('font-size', '10');
  index.setAttribute('text-anchor', 'end');
  index.textContent = `#${node.metadata.command_index}`;
  g.appendChild(index);

  return g;
}

renderTerminalOutputNode(node) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'node terminal-output');
  g.setAttribute('data-node-id', node.id);
  g.setAttribute('data-node-type', 'terminal_output');
  g.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);

  // Calculate height based on content lines
  const lines = node.content.split('\n');
  const height = Math.min(120, 40 + lines.length * 16);

  // Background rectangle with cyan gradient
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '200');
  rect.setAttribute('height', height);
  rect.setAttribute('rx', '8');
  rect.setAttribute('ry', '8');
  rect.setAttribute('fill', 'url(#terminalOutputGradient)');
  rect.setAttribute('stroke', '#06b6d4');
  rect.setAttribute('stroke-width', '2');
  g.appendChild(rect);

  // Success icon
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  icon.setAttribute('d', 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
  icon.setAttribute('stroke', '#22c55e');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('transform', 'translate(5, 5) scale(0.8)');
  g.appendChild(icon);

  // Output text (multiline, monospace)
  let yOffset = 25;
  lines.slice(0, 5).forEach((line, i) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '30');
    text.setAttribute('y', yOffset);
    text.setAttribute('fill', '#e5e7eb');
    text.setAttribute('font-family', "'Fira Code', 'Consolas', monospace");
    text.setAttribute('font-size', '11');
    text.textContent = line.slice(0, 35);
    g.appendChild(text);
    yOffset += 16;
  });

  // Exit code and duration
  const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  metadata.setAttribute('x', '10');
  metadata.setAttribute('y', height - 10);
  metadata.setAttribute('fill', '#9ca3af');
  metadata.setAttribute('font-size', '9');
  metadata.textContent = `exit: ${node.metadata.exit_code} | ${node.metadata.duration_ms}ms`;
  g.appendChild(metadata);

  return g;
}

renderTerminalErrorNode(node) {
  // Similar to output but with red colors and error icon
  const g = this.renderTerminalOutputNode(node);
  g.setAttribute('class', 'node terminal-error');

  // Update gradient to red
  const rect = g.querySelector('rect');
  rect.setAttribute('fill', 'url(#terminalErrorGradient)');
  rect.setAttribute('stroke', '#ef4444');

  // Update icon to error (X)
  const icon = g.querySelector('path');
  icon.setAttribute('d', 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z');
  icon.setAttribute('stroke', '#ef4444');

  // Make text bold and red-tinted
  g.querySelectorAll('text').forEach(text => {
    text.setAttribute('fill', '#fca5a5');
    text.setAttribute('font-weight', 'bold');
  });

  return g;
}
```

**Task 3.2: Add Terminal Gradients to SVG Defs**
```javascript
// In canvas.js, update setupCanvas() or similar initialization

function addTerminalGradients() {
  const defs = document.querySelector('#canvas defs');
  if (!defs) return;

  // Terminal Input Gradient (Green)
  const inputGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  inputGrad.setAttribute('id', 'terminalInputGradient');
  inputGrad.setAttribute('x1', '0%');
  inputGrad.setAttribute('y1', '0%');
  inputGrad.setAttribute('x2', '100%');
  inputGrad.setAttribute('y2', '100%');
  inputGrad.innerHTML = `
    <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
  `;
  defs.appendChild(inputGrad);

  // Terminal Output Gradient (Cyan)
  const outputGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  outputGrad.setAttribute('id', 'terminalOutputGradient');
  outputGrad.setAttribute('x1', '0%');
  outputGrad.setAttribute('y1', '0%');
  outputGrad.setAttribute('x2', '100%');
  outputGrad.setAttribute('y2', '100%');
  outputGrad.innerHTML = `
    <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.8" />
    <stop offset="100%" style="stop-color:#0891b2;stop-opacity:0.8" />
  `;
  defs.appendChild(outputGrad);

  // Terminal Error Gradient (Red)
  const errorGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  errorGrad.setAttribute('id', 'terminalErrorGradient');
  errorGrad.setAttribute('x1', '0%');
  errorGrad.setAttribute('y1', '0%');
  errorGrad.setAttribute('x2', '100%');
  errorGrad.setAttribute('y2', '100%');
  errorGrad.innerHTML = `
    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.9" />
    <stop offset="100%" style="stop-color:#dc2626;stop-opacity:0.9" />
  `;
  defs.appendChild(errorGrad);
}
```

**Task 3.3: Update Layout Algorithm for Terminal Nodes**
```javascript
// In canvas.js, update layoutNodes() method

layoutNodes(nodes) {
  // Separate terminal nodes from regular nodes
  const terminalNodes = nodes.filter(n => n.type?.startsWith('terminal_'));
  const regularNodes = nodes.filter(n => !n.type?.startsWith('terminal_'));

  // Layout terminal nodes sequentially
  if (terminalNodes.length > 0) {
    this.layoutTerminalNodes(terminalNodes);
  }

  // Layout regular nodes with existing algorithm
  if (regularNodes.length > 0) {
    this.layoutRegularNodes(regularNodes);
  }

  return [...terminalNodes, ...regularNodes];
}

layoutTerminalNodes(nodes) {
  // Sort by command_index to ensure proper order
  nodes.sort((a, b) => {
    const aIndex = a.metadata?.command_index || 0;
    const bIndex = b.metadata?.command_index || 0;
    return aIndex - bIndex;
  });

  const X_CENTER = 400;
  const Y_START = 100;
  const Y_INPUT_OUTPUT_GAP = 100;  // Gap between input and output
  const Y_COMMAND_PAIR_GAP = 50;   // Gap between output and next input

  let currentY = Y_START;
  let currentPairId = null;

  nodes.forEach(node => {
    // Position the node
    node.position = { x: X_CENTER, y: currentY };

    // Calculate next Y position
    if (node.type === 'terminal_input') {
      // Input node - next will be output/error below it
      currentPairId = node.id;
      currentY += Y_INPUT_OUTPUT_GAP;
    } else if (node.type === 'terminal_output' || node.type === 'terminal_error') {
      // Output/error node - add larger gap before next input
      currentY += Y_COMMAND_PAIR_GAP + (node.content.split('\n').length * 5);
    }
  });
}
```

**Task 3.4: Add CSS Animations**
```css
/* In style-v2.css */

/* Terminal node fade-in animation */
.node.terminal-input,
.node.terminal-output,
.node.terminal-error {
  animation: fadeInNode 0.3s ease-out;
}

@keyframes fadeInNode {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Status indicator pulse for pending/executing */
.node.terminal-input circle[data-status="pending"],
.node.terminal-input circle[data-status="executing"] {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Terminal node hover effects */
.node.terminal-input:hover,
.node.terminal-output:hover,
.node.terminal-error:hover {
  filter: brightness(1.2);
  cursor: pointer;
}

/* Sequential edge styling */
.edge[data-type="sequential_flow"] {
  stroke-dasharray: 5, 5;
  animation: dash 0.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}
```

---

### 5.4 Phase 4: WebSocket & Server Enhancement (1-2 hours)

**Files to Modify:**
- `server.js`
- `app.js`

**Task 4.1: Update Server to Handle Terminal Nodes**
```javascript
// In server.js, update handleMessage() function

case MessageType.NODE_UPDATE:
  // Handle node update
  if (data.nodes) {
    // Merge or replace nodes
    data.nodes.forEach(newNode => {
      const existingIndex = flowData.nodes.findIndex(n => n.id === newNode.id);
      if (existingIndex >= 0) {
        // Update existing node (e.g., status change)
        flowData.nodes[existingIndex] = { ...flowData.nodes[existingIndex], ...newNode };
      } else {
        // Add new node
        flowData.nodes.push(newNode);
      }
    });

    // Add edges if provided
    if (data.edges) {
      data.edges.forEach(newEdge => {
        const existingEdge = flowData.edges.find(e => e.id === newEdge.id);
        if (!existingEdge) {
          flowData.edges.push(newEdge);
        }
      });
    }

    // Broadcast to all clients EXCEPT sender
    broadcast({
      type: MessageType.NODE_UPDATE,
      nodes: data.nodes,
      edges: data.edges || [],
      timestamp: new Date().toISOString()
    }, client);

    // Save to file (debounced)
    debouncedSave();
  }
  break;
```

**Task 4.2: Add Debounced Save**
```javascript
// In server.js, add debounced save to reduce I/O

let saveTimeout = null;

function debouncedSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveFlowData();
    saveTimeout = null;
  }, 1000); // Save 1 second after last update
}
```

**Task 4.3: Update Client to Deduplicate Messages**
```javascript
// In app.js, update handleMessage() function

handleMessage(event) {
  try {
    const data = JSON.parse(event.data);

    // Track processed messages to avoid duplicates
    if (!this.processedMessages) {
      this.processedMessages = new Set();
    }

    // Generate message hash for deduplication
    const messageHash = this.hashMessage(data);
    if (this.processedMessages.has(messageHash)) {
      console.log('Duplicate message ignored:', messageHash);
      return;
    }
    this.processedMessages.add(messageHash);

    // Clean old hashes (keep last 100)
    if (this.processedMessages.size > 100) {
      const hashes = Array.from(this.processedMessages);
      this.processedMessages = new Set(hashes.slice(-100));
    }

    // ... rest of existing handleMessage code ...
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
  }
}

hashMessage(data) {
  // Create simple hash from message type and node IDs
  if (data.type === 'node_update' && data.nodes) {
    return `${data.type}-${data.nodes.map(n => n.id).join('-')}`;
  }
  return `${data.type}-${data.timestamp || Date.now()}`;
}
```

---

### 5.5 Phase 5: Testing & Debugging (2 hours)

**Task 5.1: Create Automated Tests**

Create `test-terminal-flow.js`:

```javascript
/**
 * Terminal Flow Visualization Tests
 */

const assert = require('assert');

describe('Terminal Flow Visualization', () => {
  let parser, terminalInput, canvas;

  beforeEach(() => {
    // Initialize components
    parser = new Parser();
    terminalInput = new TerminalInput();
    canvas = new Canvas();
  });

  describe('Parser Terminal Execution', () => {
    test('creates input and output nodes', () => {
      const result = parser.parseTerminalExecution(
        'pwd',
        { success: true, output: '/home/user', exit_code: 0 },
        { session_id: 'test', command_index: 0 }
      );

      assert.strictEqual(result.nodes.length, 2);
      assert.strictEqual(result.nodes[0].type, 'terminal_input');
      assert.strictEqual(result.nodes[1].type, 'terminal_output');
      assert.strictEqual(result.edges.length, 1);
    });

    test('creates error node for failed command', () => {
      const result = parser.parseTerminalExecution(
        'invalid',
        { success: false, output: 'Command not found', exit_code: 127 },
        { session_id: 'test', command_index: 1 }
      );

      assert.strictEqual(result.nodes[1].type, 'terminal_error');
      assert.strictEqual(result.nodes[1].metadata.exit_code, 127);
    });

    test('creates sequential edges between commands', () => {
      const result1 = parser.parseTerminalExecution(
        'pwd',
        { success: true, output: '/home', exit_code: 0 },
        { session_id: 'test', command_index: 0 }
      );

      const result2 = parser.parseTerminalExecution(
        'ls',
        { success: true, output: 'file.txt', exit_code: 0 },
        {
          session_id: 'test',
          command_index: 1,
          previous_output_id: result1.lastOutputId
        }
      );

      assert.strictEqual(result2.edges.length, 2);
      assert.strictEqual(result2.edges[1].type, 'sequential_flow');
      assert.strictEqual(result2.edges[1].style, 'dashed');
    });

    test('truncates long output', () => {
      const longOutput = Array(20).fill('line').join('\n');
      const result = parser.parseTerminalExecution(
        'cat file.txt',
        { success: true, output: longOutput, exit_code: 0 },
        { session_id: 'test', command_index: 0 }
      );

      assert.ok(result.nodes[1].content.includes('...'));
      assert.ok(result.nodes[1].metadata.truncated);
    });
  });

  describe('Terminal Input Queue Processing', () => {
    test('processes commands sequentially', async () => {
      const commands = ['pwd', 'ls', 'whoami'];
      const results = [];

      // Mock executeCommand
      terminalInput.executeCommand = async (cmd) => {
        results.push(cmd);
        return `Result of ${cmd}`;
      };

      // Add all commands to queue
      commands.forEach(cmd => terminalInput.commandQueue.push(cmd));

      // Process queue
      await terminalInput.processQueue();

      assert.deepStrictEqual(results, commands);
    });

    test('handles errors gracefully', async () => {
      terminalInput.executeCommand = async () => {
        throw new Error('Command failed');
      };

      let errorCaught = false;
      try {
        await terminalInput.executeAndVisualize('invalid');
      } catch (e) {
        errorCaught = true;
      }

      // Should NOT throw - should create error node instead
      assert.strictEqual(errorCaught, false);
    });
  });

  describe('Canvas Terminal Node Rendering', () => {
    test('renders input node with correct styling', () => {
      const node = {
        id: 'node-1',
        type: 'terminal_input',
        content: 'pwd',
        position: { x: 400, y: 100 },
        metadata: {
          timestamp: new Date().toISOString(),
          command_index: 0,
          status: 'complete'
        }
      };

      const svg = canvas.renderNode(node);
      assert.ok(svg.getAttribute('class').includes('terminal-input'));
      assert.ok(svg.querySelector('rect'));
      assert.ok(svg.querySelector('text'));
    });

    test('layouts terminal nodes sequentially', () => {
      const nodes = [
        { id: '1', type: 'terminal_input', metadata: { command_index: 0 } },
        { id: '2', type: 'terminal_output', metadata: { command_index: 0 } },
        { id: '3', type: 'terminal_input', metadata: { command_index: 1 } },
        { id: '4', type: 'terminal_error', metadata: { command_index: 1 } }
      ];

      canvas.layoutTerminalNodes(nodes);

      // Check positions are increasing (top to bottom)
      assert.ok(nodes[0].position.y < nodes[1].position.y);
      assert.ok(nodes[1].position.y < nodes[2].position.y);
      assert.ok(nodes[2].position.y < nodes[3].position.y);
    });
  });

  describe('Integration Tests', () => {
    test('end-to-end command execution and visualization', async () => {
      // Setup
      const testCommand = 'echo "hello"';
      const expectedOutput = 'hello';

      // Execute
      await terminalInput.processMessage(testCommand);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify nodes created
      const canvasData = canvas.getData();
      const inputNodes = canvasData.nodes.filter(n => n.type === 'terminal_input');
      const outputNodes = canvasData.nodes.filter(n => n.type === 'terminal_output');

      assert.ok(inputNodes.length > 0);
      assert.ok(outputNodes.length > 0);
      assert.ok(inputNodes[0].content.includes(testCommand));
      assert.ok(outputNodes[0].content.includes(expectedOutput));
    });
  });
});

// Run tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { /* test exports */ };
}
```

**Task 5.2: Create Manual Testing Checklist**

Create `TESTING-CHECKLIST.md`:

```markdown
# Terminal Flow Visualization - Testing Checklist

## Preparation
- [ ] Server is running (`./start.sh`)
- [ ] Browser open to http://localhost:3000
- [ ] Developer console open (F12)
- [ ] Canvas visible with no errors

## Basic Functionality
- [ ] Type `pwd` - see input node appear immediately
- [ ] Wait for output - see output node appear below input
- [ ] Verify nodes are connected by solid edge
- [ ] Check input node has green color
- [ ] Check output node has cyan color

## Sequential Commands
- [ ] Execute `pwd`, then `ls`, then `whoami`
- [ ] Verify 6 nodes appear (3 inputs, 3 outputs)
- [ ] Verify nodes are in correct order (top to bottom)
- [ ] Verify sequential edges connect output₁ → input₂ → output₂ → input₃
- [ ] Sequential edges should be dashed

## Error Handling
- [ ] Execute invalid command: `invalid-command-xyz`
- [ ] Verify error node appears (red color)
- [ ] Verify error message is displayed
- [ ] Verify error node shows exit code
- [ ] Verify next command still works after error

## Real-Time Updates
- [ ] Open browser in two tabs
- [ ] Execute command in Tab 1
- [ ] Verify node appears in Tab 2 immediately (<500ms)
- [ ] Execute command in Tab 2
- [ ] Verify node appears in Tab 1

## Edge Cases
- [ ] Execute command with no output: `:`
- [ ] Verify output node still created
- [ ] Execute command with long output: `cat large-file.txt`
- [ ] Verify output is truncated to 5 lines
- [ ] Verify "... X more lines" indicator
- [ ] Execute special commands: `/help`, `/status`, `/clear`
- [ ] Verify no nodes created for special commands

## Visual Quality
- [ ] Zoom in/out - nodes scale properly
- [ ] Pan around - nodes remain connected
- [ ] Hover over nodes - see hover effect
- [ ] Click node - see tooltip with full output
- [ ] Auto-scroll - canvas scrolls to latest node

## Performance
- [ ] Execute 50 commands rapidly
- [ ] Verify no lag or freezing
- [ ] Check memory usage (< 100MB increase)
- [ ] Verify all 50 commands visible
- [ ] Execute 100 commands total
- [ ] Verify canvas still responsive

## WebSocket Resilience
- [ ] Kill and restart server while browser open
- [ ] Verify reconnection message
- [ ] Execute command after reconnection
- [ ] Verify it works correctly
- [ ] Verify all previous nodes still visible

## Fallback Mode
- [ ] Disable WebSocket (server down)
- [ ] Execute commands
- [ ] Verify nodes still appear (fallback to direct render)
- [ ] Start server
- [ ] Verify WebSocket reconnects

## Metadata Accuracy
- [ ] Execute command and inspect node in console
- [ ] Verify all metadata fields present:
  - [ ] timestamp
  - [ ] terminal_session
  - [ ] command_index
  - [ ] status
  - [ ] working_directory
  - [ ] exit_code (output nodes)
  - [ ] duration_ms (output nodes)

## Browser Compatibility
- [ ] Test in Chrome/Chromium
- [ ] Test in Firefox
- [ ] Test in mobile browser (Termux internal browser)

## Pass Criteria
- All checkboxes ticked
- No console errors
- No visual glitches
- Smooth performance (60fps)
- Correct node ordering
- Accurate metadata

## Known Issues (Document Any)
- Issue 1: ...
- Issue 2: ...

---
**Tested By:** _________________
**Date:** _________________
**Result:** PASS / FAIL
```

---

## 6. RISK ASSESSMENT & MITIGATION

### Risk 1: Race Conditions in Concurrent Command Execution
**Severity:** HIGH
**Probability:** MEDIUM

**Description:**
Multiple commands executed rapidly could arrive out of order, causing incorrect sequential linking.

**Mitigation:**
- Implement command queue with FIFO processing
- Add message sequence numbers
- Block new commands until previous completes

**Code:**
```javascript
// In terminal-input.js
this.commandQueue = [];
this.isProcessing = false;
this.sequenceNumber = 0;
```

### Risk 2: WebSocket Message Loss
**Severity:** MEDIUM
**Probability:** LOW

**Description:**
Network issues could cause node updates to be lost, resulting in incomplete visualization.

**Mitigation:**
- Implement message acknowledgment (ACK)
- Store pending messages and retry on failure
- Fallback to direct canvas render

**Code:**
```javascript
// In terminal-input.js
async sendWithRetry(message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const success = window.app.sendMessage(message);
    if (success) return true;
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
  // Fallback
  this.directRenderNodes(message.nodes, message.edges);
  return false;
}
```

### Risk 3: Parser Breaking Changes
**Severity:** MEDIUM
**Probability:** LOW

**Description:**
Adding new node types could break existing parser functionality.

**Mitigation:**
- Keep parseInteraction() unchanged
- Add new parseTerminalExecution() method
- Write comprehensive tests
- Backward compatibility checks

### Risk 4: Canvas Performance Degradation
**Severity:** HIGH
**Probability:** MEDIUM

**Description:**
Large number of terminal nodes (1000+) could slow down rendering.

**Mitigation:**
- Implement virtual rendering (only render visible nodes)
- Use requestAnimationFrame for smooth updates
- Debounce rapid updates
- Consider pagination after 500 nodes

**Code:**
```javascript
// In canvas.js
renderWithDebounce(data) {
  if (this.renderTimeout) {
    cancelAnimationFrame(this.renderTimeout);
  }
  this.renderTimeout = requestAnimationFrame(() => {
    this.render(data);
  });
}
```

### Risk 5: Terminal Context Not Preserved Across Sessions
**Severity:** LOW
**Probability:** MEDIUM

**Description:**
Server restart could lose terminal session context.

**Mitigation:**
- Persist terminal_session in flowData
- Generate consistent session IDs
- Store in localStorage as backup

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests (80% Coverage Target)

**Parser Tests (parser-v2.test.js):**
- ✅ parseTerminalExecution creates correct node types
- ✅ Error nodes created for failed commands
- ✅ Sequential edges generated correctly
- ✅ Metadata populated accurately
- ✅ Output truncation works
- ✅ ID generation is unique

**Terminal Input Tests (terminal-input.test.js):**
- ✅ Command queue processes sequentially
- ✅ Pending nodes created immediately
- ✅ Error handling doesn't crash
- ✅ WebSocket fallback works
- ✅ Session ID persists

**Canvas Tests (canvas.test.js):**
- ✅ Terminal nodes render with correct SVG
- ✅ Layout algorithm positions correctly
- ✅ Sequential edges drawn properly
- ✅ Gradients applied correctly

### 7.2 Integration Tests

**End-to-End Flow:**
```javascript
test('complete terminal command flow', async () => {
  // 1. Execute command
  await terminalInput.processMessage('pwd');

  // 2. Wait for completion
  await waitFor(() => canvas.getData().nodes.length >= 2);

  // 3. Verify input node
  const inputNode = canvas.getData().nodes.find(n =>
    n.type === 'terminal_input'
  );
  expect(inputNode).toBeDefined();
  expect(inputNode.content).toBe('pwd');

  // 4. Verify output node
  const outputNode = canvas.getData().nodes.find(n =>
    n.type === 'terminal_output'
  );
  expect(outputNode).toBeDefined();
  expect(outputNode.metadata.parent_command).toBe(inputNode.id);

  // 5. Verify edge
  const edge = canvas.getData().edges.find(e =>
    e.source === inputNode.id && e.target === outputNode.id
  );
  expect(edge).toBeDefined();
});
```

### 7.3 Manual Testing

**Checklist in TESTING-CHECKLIST.md**

### 7.4 Performance Tests

```javascript
test('handles 100 commands without lag', async () => {
  const startTime = Date.now();

  for (let i = 0; i < 100; i++) {
    await terminalInput.processMessage(`echo "Command ${i}"`);
  }

  const duration = Date.now() - startTime;

  // Should complete in < 10 seconds
  expect(duration).toBeLessThan(10000);

  // All nodes should be present
  expect(canvas.getData().nodes.length).toBe(200); // 100 inputs + 100 outputs
});
```

---

## 8. IMPLEMENTATION TIMELINE

### Day 1: Foundation (4 hours)
- **Hour 1-2:** Parser enhancement (Phase 1)
  - Add node types to parser-config.json
  - Implement parseTerminalExecution()
  - Write unit tests

- **Hour 3-4:** Terminal input update (Phase 2, Part 1)
  - Add session management
  - Implement command queue
  - Create pending node creation

### Day 2: Visualization (4 hours)
- **Hour 1-3:** Canvas enhancement (Phase 3)
  - Implement terminal node rendering methods
  - Add SVG gradients
  - Update layout algorithm
  - Add CSS animations

- **Hour 4:** Terminal input update (Phase 2, Part 2)
  - Complete createTerminalNodes()
  - Add error handling
  - Implement fallback rendering

### Day 3: Integration & Testing (3 hours)
- **Hour 1-2:** WebSocket & server updates (Phase 4)
  - Update server message handling
  - Add deduplication in client
  - Implement debounced save

- **Hour 3:** Testing (Phase 5, Part 1)
  - Run automated tests
  - Fix failing tests
  - Manual smoke testing

### Day 4: Polish & Documentation (2 hours)
- **Hour 1:** Testing (Phase 5, Part 2)
  - Complete manual testing checklist
  - Performance testing
  - Browser compatibility

- **Hour 2:** Documentation
  - Update README
  - Write usage guide
  - Create demo video/screenshots

**Total: 13 hours over 4 days**

---

## 9. SUCCESS METRICS

### Functional Metrics
- ✅ 100% of commands create visible nodes
- ✅ 100% of nodes appear within 100ms
- ✅ 0 data loss (all commands captured)
- ✅ 0 duplicate nodes
- ✅ Sequential order maintained

### Performance Metrics
- ✅ < 50ms node creation time
- ✅ < 100ms canvas render time
- ✅ 60fps during normal operation
- ✅ Handles 1000+ nodes without lag

### Quality Metrics
- ✅ 80%+ test coverage
- ✅ 0 critical bugs
- ✅ < 5 minor bugs
- ✅ Passes manual testing checklist

### User Experience Metrics
- ✅ Clear visual distinction (input/output/error)
- ✅ Intuitive flow (top to bottom)
- ✅ Informative metadata (tooltips)
- ✅ Smooth animations

---

## 10. ROLLBACK PLAN

If critical issues are discovered:

### Rollback Steps
1. Stop the server
2. Checkout previous commit:
   ```bash
   git log --oneline
   git checkout <previous-commit-hash>
   ```
3. Restart server
4. Verify functionality restored

### Feature Flag Alternative
Add feature flag to enable/disable terminal flow:

```javascript
// In terminal-input.js
const ENABLE_TERMINAL_FLOW = false; // Set to false to disable

async createNodes(message, response) {
  if (!ENABLE_TERMINAL_FLOW) {
    // Use old parseInteraction method
    return this.createNodesOld(message, response);
  }

  // Use new terminal flow method
  return this.createTerminalNodes(message, response);
}
```

---

## 11. FUTURE ENHANCEMENTS

### Phase 6: Advanced Features (Optional)
- Command autocomplete
- Syntax highlighting
- Multi-line commands
- Command history search
- Export terminal session
- Replay terminal session
- Share terminal flow as URL

### Phase 7: Claude Code Integration
- Execute Claude Code prompts from terminal
- Visualize Claude reasoning as nodes
- Stream Claude responses in real-time
- Connect command output to Claude input

---

## 12. CONCLUSION

This plan provides a comprehensive roadmap for implementing terminal input/output visualization with:

✅ **Clear requirements** - Functional and non-functional
✅ **Detailed architecture** - Node types, layout, message flow
✅ **Implementation phases** - 5 phases, 13 hours total
✅ **Risk mitigation** - Identified 5 risks with solutions
✅ **Testing strategy** - Unit, integration, manual, performance
✅ **Success metrics** - Measurable outcomes
✅ **Rollback plan** - Safety net for issues

The plan follows BMAD V6 methodology with:
- Epic-level breakdown
- Detailed technical specifications
- Code examples for all major components
- Comprehensive testing strategy
- Clear timeline and milestones

**Ready for implementation approval.**

---

**Plan Version:** 1.0
**Created:** 2025-10-22
**Status:** Ready for Review
**Estimated Effort:** 11-13 hours
**Risk Level:** Medium
**Priority:** Critical
